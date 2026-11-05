#!/usr/bin/env node
/**
 * scripts/test-window-notify.js
 * 
 * Verifies room selection window scheduling, validation error messages,
 * atomic opening notifications, lazy trigger mechanism, and idempotency.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import assert from "assert";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load environment variables
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
  console.log("  HOSTELMATCH SELECTION WINDOW & NOTIFICATION VERIFICATION");
  console.log("==================================================================");

  const { default: connectDB } = await import("../src/lib/db.js");
  const { default: SelectionWindow } = await import("../src/models/SelectionWindow.js");
  const { default: Notification } = await import("../src/models/Notification.js");
  const { default: User } = await import("../src/models/User.js");
  const {
    createWindow,
    getCurrentWindow,
    ensureOpenNotification,
  } = await import("../src/services/selectionWindowService.js");
  const { getSelectionState } = await import("../src/services/roomSelectionService.js");
  const { validateWindowInput } = await import("../src/services/selection/windowStatus.js");

  await connectDB();
  console.log(" Connected to MongoDB.");

  // Save any existing active window to restore after test
  const originalWindow = await SelectionWindow.findOne({ isActive: true });
  if (originalWindow) {
    await SelectionWindow.updateOne({ _id: originalWindow._id }, { $set: { isActive: false } });
  }

  // Find admin and active students
  let admin = await User.findOne({ role: "admin" });
  if (!admin) {
    admin = await User.create({
      name: "Test Admin",
      email: `test_admin_${Date.now()}@hostelmatch.test`,
      password: "password12345",
      role: "admin",
      isActive: true,
    });
  }

  const activeStudents = await User.find({ role: "student", isActive: true }).select("_id").lean();
  const activeStudentCount = activeStudents.length;
  console.log(` Target active students for notification: ${activeStudentCount}`);

  let createdWindowIds = [];
  let testNotificationsDedupeKeys = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Missing start or end gives the right message
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 1: Validation Error Messages ---");

    const missingStart = validateWindowInput({ startsAt: null, endsAt: new Date(Date.now() + 3600000) });
    assert.strictEqual(missingStart.valid, false);
    assert.strictEqual(missingStart.error, "Start date is required");
    console.log(" Missing start date error: PASS ->", missingStart.error);

    const missingEnd = validateWindowInput({ startsAt: new Date(), endsAt: null });
    assert.strictEqual(missingEnd.valid, false);
    assert.strictEqual(missingEnd.error, "End date is required");
    console.log(" Missing end date error: PASS ->", missingEnd.error);

    const pastEnd = validateWindowInput({
      startsAt: new Date(Date.now() - 7200000),
      endsAt: new Date(Date.now() - 3600000),
    });
    assert.strictEqual(pastEnd.valid, false);
    assert.strictEqual(pastEnd.error, "End must be in the future");
    console.log(" Past end date error: PASS ->", pastEnd.error);

    const tooShort = validateWindowInput({
      startsAt: new Date(Date.now() + 60000),
      endsAt: new Date(Date.now() + 180000), // only 2 minutes
    });
    assert.strictEqual(tooShort.valid, false);
    assert.strictEqual(tooShort.error, "End must be at least 5 minutes after start");
    console.log(" Too short duration error: PASS ->", tooShort.error);

    // -------------------------------------------------------------------------
    // TEST 2: Future window creation succeeds and stays 'scheduled' (no notify yet)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Scheduled Future Window (No Early Notification) ---");

    const futureStart = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future
    const futureEnd = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours in future

    const scheduledWindow = await createWindow(admin._id.toString(), {
      name: "Scheduled Fall Window",
      startsAt: futureStart.toISOString(),
      endsAt: futureEnd.toISOString(),
    });

    createdWindowIds.push(scheduledWindow.id);
    assert.strictEqual(scheduledWindow.status, "scheduled");
    assert.strictEqual(scheduledWindow.openNotifiedAt, null);
    console.log(" Window created with future start is 'scheduled': PASS");

    const notifsBefore = await Notification.countDocuments({
      type: "room_selection_open",
      dedupeKey: `room_selection_open_${scheduledWindow.id}`,
    });
    assert.strictEqual(notifsBefore, 0);
    console.log(" Future window generated 0 opening notifications: PASS");

    // -------------------------------------------------------------------------
    // TEST 3: Scheduled start time arrives (simulated by setting startsAt to past)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Start Time Arrives & Lazy Trigger Notifies Active Students ---");

    // Simulate clock reaching start time
    await SelectionWindow.updateOne(
      { _id: scheduledWindow.id },
      { $set: { startsAt: new Date(Date.now() - 60000) } } // 1 minute in the past
    );

    // Read window via getCurrentWindow (lazy trigger check)
    const activeRead = await getCurrentWindow();
    assert.strictEqual(activeRead.status, "open");
    assert.notStrictEqual(activeRead.openNotifiedAt, null);
    console.log(" Window transitioned to 'open' and openNotifiedAt was timestamped: PASS");

    testNotificationsDedupeKeys.push(`room_selection_open_${scheduledWindow.id}`);

    const notifsAfter = await Notification.countDocuments({
      type: "room_selection_open",
      dedupeKey: new RegExp(`^room_selection_open_${scheduledWindow.id}`),
    });
    assert.strictEqual(notifsAfter, activeStudentCount);
    console.log(` Every active student (${activeStudentCount}/${activeStudentCount}) received notification: PASS`);

    // Verify notification structure
    const sampleNotif = await Notification.findOne({
      type: "room_selection_open",
      dedupeKey: new RegExp(`^room_selection_open_${scheduledWindow.id}`),
    });
    assert(sampleNotif.title.includes("Room selection is now open"));
    assert.strictEqual(sampleNotif.link, "/dashboard/rooms");
    console.log(` Notification title: "${sampleNotif.title}", link: "${sampleNotif.link}": PASS`);

    // -------------------------------------------------------------------------
    // TEST 4: Calling read functions 5 times in a row leaves exactly 1 notif per student
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Idempotency under Repeated Reads (5 Consecutive Reads) ---");

    const sampleStudent = activeStudents[0];
    for (let i = 1; i <= 5; i++) {
      await getCurrentWindow();
      if (sampleStudent) {
        await getSelectionState(sampleStudent._id.toString());
      }
    }

    const notifsAfterRepeated = await Notification.countDocuments({
      type: "room_selection_open",
      dedupeKey: new RegExp(`^room_selection_open_${scheduledWindow.id}`),
    });
    assert.strictEqual(notifsAfterRepeated, activeStudentCount);
    console.log(` Total notifications remain exactly ${activeStudentCount} (Zero duplicates after 5 reads): PASS`);

    // Close and remove the first test window
    await SelectionWindow.updateOne({ _id: scheduledWindow.id }, { $set: { isActive: false } });

    // -------------------------------------------------------------------------
    // TEST 5: Window created with startsAt "now" becomes open immediately and notifies
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Window Created with startsAt 'Now' Opens Immediately ---");

    const nowStart = new Date();
    const nowEnd = new Date(Date.now() + 60 * 60 * 1000);

    const immediateWindow = await createWindow(admin._id.toString(), {
      name: "Immediate Flash Window",
      startsAt: nowStart.toISOString(),
      endsAt: nowEnd.toISOString(),
    });

    createdWindowIds.push(immediateWindow.id);
    testNotificationsDedupeKeys.push(new RegExp(`^room_selection_open_${immediateWindow.id}`));

    assert.strictEqual(immediateWindow.status, "open");
    assert.notStrictEqual(immediateWindow.openNotifiedAt, null);
    console.log(" Window created with start 'now' is 'open' immediately: PASS");

    const immediateNotifs = await Notification.countDocuments({
      type: "room_selection_open",
      dedupeKey: new RegExp(`^room_selection_open_${immediateWindow.id}`),
    });
    assert.strictEqual(immediateNotifs, activeStudentCount);
    console.log(` Immediate window notified all ${activeStudentCount} active students once: PASS`);

    console.log("\n==================================================================");
    console.log("  ALL TESTS PASSED SUCCESSFULLY! (PASS)");
    console.log("==================================================================");
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("\nCleaning up test artifacts...");
    if (createdWindowIds.length > 0) {
      await SelectionWindow.deleteMany({ _id: { $in: createdWindowIds } });
    }
    if (testNotificationsDedupeKeys.length > 0) {
      for (const pattern of testNotificationsDedupeKeys) {
        await Notification.deleteMany({ dedupeKey: pattern });
      }
    }
    if (originalWindow) {
      await SelectionWindow.updateOne({ _id: originalWindow._id }, { $set: { isActive: true } });
    }
    console.log(" Cleanup complete. Database restored.");
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error("\nTEST SUITE FAILED (FAIL):", err);
  process.exit(1);
});
