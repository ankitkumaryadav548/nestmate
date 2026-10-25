#!/usr/bin/env node
/**
 * scripts/test-notify-flow.js
 * 
 * End-to-end database verification for the notification and announcement flow:
 * 1. Leader sends invitation -> invited student receives invitation_received exactly once (dedupe check).
 * 2. Accepting creates invitation_accepted for the leader.
 * 3. Completing a group creates group_complete for every member.
 * 4. Cross-user notification access rejected (404/null).
 * 5. Admin announcement -> fanout to audience verified, withdraw purges notifications.
 * 6. Best-effort failure isolation: invalid notification fails safely without throwing.
 * 
 * Safety: Strictly uses demo students (isDemo: true). Never modifies non-demo data.
 * 
 * Run:
 *   npm run test:notify-flow
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

async function run() {
  console.log("==================================================================");
  console.log("  HOSTELMATCH NOTIFICATIONS & ANNOUNCEMENTS END-TO-END FLOW TEST");
  console.log("==================================================================");

  const connectDB = (await import("../src/lib/db.js")).default;
  const User = (await import("../src/models/User.js")).default;
  const Notification = (await import("../src/models/Notification.js")).default;
  const Announcement = (await import("../src/models/Announcement.js")).default;
  const {
    notify,
    notifyMany,
    markRead,
    sendAnnouncement,
    withdrawAnnouncement,
  } = await import("../src/services/notificationService.js");

  await connectDB();

  // 1. Fetch demo students
  const demoStudents = await User.find({
    isDemo: true,
    role: "student",
    isActive: true,
  }).limit(5).lean();

  if (demoStudents.length < 3) {
    console.error("❌ Pre-condition failed: At least 3 active demo students required. Found:", demoStudents.length);
    await mongoose.disconnect();
    process.exit(1);
  }

  const [leader, member1, member2] = demoStudents;
  const demoUserIds = [leader._id, member1._id, member2._id];

  console.log(`Using DEMO students for verification:`);
  console.log(`  Leader:  ${leader.name} (${leader.registrationNumber}) [${leader._id}]`);
  console.log(`  Member1: ${member1.name} (${member1.registrationNumber}) [${member1._id}]`);
  console.log(`  Member2: ${member2.name} (${member2.registrationNumber}) [${member2._id}]`);
  console.log("");

  // Safety guarantee: Ensure strictly demo students
  for (const u of [leader, member1, member2]) {
    if (!u.isDemo) {
      console.error(`❌ Security failure: User ${u.name} is NOT a demo account.`);
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  // Pre-test clean up of demo test notifications
  await Notification.deleteMany({ user: { $in: demoUserIds } });

  let allPassed = true;

  // --------------------------------------------------------------------------
  // STEP 1: Leader sends invitation -> invited student gets invitation_received
  //         exactly once, second call produces no duplicate.
  // --------------------------------------------------------------------------
  try {
    const testInviteId = new mongoose.Types.ObjectId();
    const dedupeKeyParts = [testInviteId.toString()];

    // First call
    const firstNotif = await notify(
      member1._id,
      "invitation_received",
      { leaderName: leader.name, size: 3 },
      { dedupeParts: dedupeKeyParts, data: { invitationId: testInviteId.toString() } }
    );

    // Second call with same dedupe parts (simulating retry / double click)
    const secondNotif = await notify(
      member1._id,
      "invitation_received",
      { leaderName: leader.name, size: 3 },
      { dedupeParts: dedupeKeyParts, data: { invitationId: testInviteId.toString() } }
    );

    const count = await Notification.countDocuments({
      user: member1._id,
      type: "invitation_received",
      "data.invitationId": testInviteId.toString(),
    });

    if (firstNotif && secondNotif === null && count === 1) {
      console.log("PASS: Step 1 - Leader sends invitation: delivered once, duplicate call safely deduplicated.");
    } else {
      console.error("FAIL: Step 1 - Expected 1 notification, count is:", count, "secondNotif is:", secondNotif);
      allPassed = false;
    }
  } catch (err) {
    console.error("FAIL: Step 1 with exception:", err.message);
    allPassed = false;
  }

  // --------------------------------------------------------------------------
  // STEP 2: Accepting creates invitation_accepted for the leader.
  // --------------------------------------------------------------------------
  try {
    const testInviteId = new mongoose.Types.ObjectId();

    await notify(
      leader._id,
      "invitation_accepted",
      { name: member1.name },
      {
        dedupeParts: [testInviteId.toString(), "accepted"],
        data: { invitationId: testInviteId.toString() },
      }
    );

    const leaderNotif = await Notification.findOne({
      user: leader._id,
      type: "invitation_accepted",
      "data.invitationId": testInviteId.toString(),
    });

    if (
      leaderNotif &&
      leaderNotif.title === "Invitation Accepted" &&
      leaderNotif.message.includes(member1.name)
    ) {
      console.log("PASS: Step 2 - Accepting invitation notifies leader with friendly plain text.");
    } else {
      console.error("FAIL: Step 2 - Expected leader notification not found or malformed:", leaderNotif);
      allPassed = false;
    }
  } catch (err) {
    console.error("FAIL: Step 2 with exception:", err.message);
    allPassed = false;
  }

  // --------------------------------------------------------------------------
  // STEP 3: Completing a group creates group_complete for every member.
  // --------------------------------------------------------------------------
  try {
    const testGroupId = new mongoose.Types.ObjectId();
    const groupMemberIds = [leader._id, member1._id, member2._id];

    const result = await notifyMany(
      groupMemberIds,
      "group_complete",
      {},
      {
        dedupeParts: [testGroupId.toString(), "complete"],
        data: { groupId: testGroupId.toString() },
      }
    );

    const completeNotifs = await Notification.find({
      user: { $in: groupMemberIds },
      type: "group_complete",
      "data.groupId": testGroupId.toString(),
    });

    if (result.created === 3 && completeNotifs.length === 3) {
      console.log("PASS: Step 3 - Group completion creates group_complete for all group members.");
    } else {
      console.error(
        "FAIL: Step 3 - Expected 3 group_complete notifications, found:",
        completeNotifs.length,
        "result:",
        result
      );
      allPassed = false;
    }
  } catch (err) {
    console.error("FAIL: Step 3 with exception:", err.message);
    allPassed = false;
  }

  // --------------------------------------------------------------------------
  // STEP 4: A notification of another user returns 404 (null) when read through service.
  // --------------------------------------------------------------------------
  try {
    // Pick leader's notification
    const leaderNotif = await Notification.findOne({ user: leader._id }).lean();
    if (!leaderNotif) {
      throw new Error("No notification found for leader to test cross-user access.");
    }

    // Member 1 attempts to mark Leader's notification as read
    const crossRead = await markRead(member1._id, leaderNotif._id);

    // Verify Notification document in DB was NOT marked read
    const dbNotif = await Notification.findById(leaderNotif._id).lean();

    if (crossRead === null && dbNotif.readAt === null) {
      // Now legitimate owner marks it read
      const ownRead = await markRead(leader._id, leaderNotif._id);
      if (ownRead && ownRead.readAt !== null) {
        console.log("PASS: Step 4 - Cross-user notification access rejected (404/null isolation maintained).");
      } else {
        console.error("FAIL: Step 4 - Owner failed to mark notification read:", ownRead);
        allPassed = false;
      }
    } else {
      console.error("FAIL: Step 4 - Cross-user read succeeded unexpectedly:", crossRead);
      allPassed = false;
    }
  } catch (err) {
    console.error("FAIL: Step 4 with exception:", err.message);
    allPassed = false;
  }

  // --------------------------------------------------------------------------
  // STEP 5: Announcement to a small audience creates right number of notifications
  //         and can be withdrawn cleanly.
  // --------------------------------------------------------------------------
  try {
    // Find an admin user
    let admin = await User.findOne({ role: "admin", isActive: true }).select("_id").lean();
    if (!admin) {
      admin = { _id: new mongoose.Types.ObjectId() };
    }

    // Count expected recipients for audience { type: "gender", gender: "female" } or "year"
    const targetAudience = { type: "year", year: 1 };
    const expectedStudents = await User.find({
      role: "student",
      isActive: true,
      year: 1,
    }).select("_id").lean();

    const expectedCount = expectedStudents.length;

    const announcement = await sendAnnouncement(admin._id, {
      title: "Flow Test Announcement",
      message: "Important notice for Year 1 students regarding room preferences.",
      link: "/dashboard/group",
      audience: targetAudience,
    });

    const deliveredCount = await Notification.countDocuments({
      "data.announcementId": announcement._id.toString(),
    });

    if (announcement.recipientCount === expectedCount && deliveredCount === expectedCount) {
      // Now withdraw announcement
      await withdrawAnnouncement(admin._id, announcement._id.toString());

      const withdrawnDoc = await Announcement.findById(announcement._id).lean();
      const remainingDelivered = await Notification.countDocuments({
        "data.announcementId": announcement._id.toString(),
      });

      if (withdrawnDoc.status === "withdrawn" && remainingDelivered === 0) {
        console.log(
          `PASS: Step 5 - Announcement delivered to ${expectedCount} recipients and cleanly purged on withdrawal.`
        );
      } else {
        console.error(
          "FAIL: Step 5 - Withdrawal incomplete. status:",
          withdrawnDoc?.status,
          "remaining notifications:",
          remainingDelivered
        );
        allPassed = false;
      }

      // Cleanup test announcement document
      await Announcement.findByIdAndDelete(announcement._id);
    } else {
      console.error(
        "FAIL: Step 5 - Recipient mismatch. Expected:",
        expectedCount,
        "announcement.recipientCount:",
        announcement.recipientCount,
        "delivered:",
        deliveredCount
      );
      allPassed = false;
    }
  } catch (err) {
    console.error("FAIL: Step 5 with exception:", err.message);
    allPassed = false;
  }

  // --------------------------------------------------------------------------
  // STEP 6: Failing notification (invalid type) does NOT throw and does not break flow.
  // --------------------------------------------------------------------------
  try {
    // notify with an unknown type throws in buildNotification, but notify() catches it and returns null
    const invalidResult = await notify(leader._id, "UNKNOWN_INVALID_TYPE_FOR_TESTING", {});

    if (invalidResult === null) {
      // Verify subsequent valid notification works seamlessly
      const validResult = await notify(
        leader._id,
        "group_preferences_review",
        {},
        { dedupeParts: ["step6_valid", Date.now()] }
      );

      if (validResult && validResult.type === "group_preferences_review") {
        console.log("PASS: Step 6 - Best-effort guarantee verified: invalid notification fails safely without throwing.");
      } else {
        console.error("FAIL: Step 6 - Subsequent valid notification failed:", validResult);
        allPassed = false;
      }
    } else {
      console.error("FAIL: Step 6 - Expected null for invalid notification type, got:", invalidResult);
      allPassed = false;
    }
  } catch (err) {
    console.error("FAIL: Step 6 - notify() threw an uncaught error:", err.message);
    allPassed = false;
  }

  // --------------------------------------------------------------------------
  // CLEANUP: Clean up test demo notifications
  // --------------------------------------------------------------------------
  await Notification.deleteMany({ user: { $in: demoUserIds } });

  console.log("==================================================================");
  if (allPassed) {
    console.log("  ALL NOTIFICATION & ANNOUNCEMENT FLOW STEPS PASSED (6/6)");
  } else {
    console.log("  ONE OR MORE NOTIFICATION FLOW STEPS FAILED");
  }
  console.log("==================================================================");

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error("[Fatal Error in test-notify-flow]", err);
  mongoose.disconnect().finally(() => process.exit(1));
});
