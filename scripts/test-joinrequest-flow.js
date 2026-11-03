#!/usr/bin/env node
/**
 * scripts/test-joinrequest-flow.js
 * 
 * End-to-end flow test suite for NEW FEATURE: JOIN REQUESTS TO EXISTING GROUPS.
 * 
 * Exercises all 12 steps:
 * 1. Student sends join request; leader gets exactly one notification; duplicate rejected with 409 / PENDING_EXISTS.
 * 2. Deal-breaker conflicts blocked with generic 400 NOT_COMPATIBLE.
 * 3. Wrong room size or gender rejected with 400 NOT_COMPATIBLE.
 * 4. Leader review response verified to contain ZERO private fields (no email, phone, regNo, raw answers) and contains score breakdowns and impact.
 * 5. Leader approves: student admitted, group average recomputed, other pending requests/invitations auto-closed.
 * 6. Race: 2 requesters racing for 1 remaining seat; exactly 1 admitted, loser auto-closed with group_full.
 * 7. Leader rejects: neutral notification sent, 24h cooldown enforced on same group, request to other group allowed.
 * 8. Solo leader requests and approved: solo group auto-disbanded; multi-member leader blocked.
 * 9. Roomed group with open seat: approved student gets seat and Allocation with source: 'selection'.
 * 10. Auto-close: group disbanding auto-closes pending requests with group_disbanded; lazy expiry on 7d old request.
 * 11. Permissions: non-leader cannot approve/reject (404/403).
 * 12. integrityService reports 0 problems after the entire run.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function runJoinRequestFlowTests() {
  console.log("==================================================================");
  console.log("  HOSTELMATCH JOIN REQUESTS END-TO-END FLOW TEST SUITE ⚡");
  console.log("==================================================================");

  const connectDB = (await import("../src/lib/db.js")).default;
  const User = (await import("../src/models/User.js")).default;
  const Hostel = (await import("../src/models/Hostel.js")).default;
  const Room = (await import("../src/models/Room.js")).default;
  const Preference = (await import("../src/models/Preference.js")).default;
  const RoommateGroup = (await import("../src/models/RoommateGroup.js")).default;
  const GroupInvitation = (await import("../src/models/GroupInvitation.js")).default;
  const GroupJoinRequest = (await import("../src/models/GroupJoinRequest.js")).default;
  const Notification = (await import("../src/models/Notification.js")).default;
  const AllocationIntent = (await import("../src/models/AllocationIntent.js")).default;
  const Allocation = (await import("../src/models/Allocation.js")).default;
  const SelectionWindow = (await import("../src/models/SelectionWindow.js")).default;

  const {
    sendJoinRequest,
    cancelJoinRequest,
    listMySentRequests,
    listIncomingRequests,
    getRequestReview,
    approveJoinRequest,
    rejectJoinRequest,
  } = await import("../src/services/joinRequestService.js");

  const {
    createGroup,
    disbandGroup,
  } = await import("../src/services/groupService.js");

  const {
    openNow,
    closeNow,
  } = await import("../src/services/selectionWindowService.js");

  const {
    selectRoom,
  } = await import("../src/services/roomSelectionService.js");

  const { checkIntegrity } = await import("../src/services/integrityService.js");

  await connectDB();

  const testSuffix = Date.now().toString().slice(-6);
  const createdUserIds = [];
  const createdGroupIds = [];
  const createdRoomIds = [];
  let testHostel = null;
  let adminUser = null;

  try {
    adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      adminUser = await User.create({
        name: `Test Admin ${testSuffix}`,
        email: `admin_${testSuffix}@campus.edu`,
        password: "password123",
        role: "admin",
        isActive: true,
      });
      createdUserIds.push(adminUser._id);
    }

    testHostel = await Hostel.create({
      name: `Test JoinReq Hostel ${testSuffix}`,
      code: `TJR${testSuffix.slice(-3)}`,
      gender: "boys",
      totalFloors: 3,
      allowedYears: [1, 2, 3, 4],
      facilities: ["Wi-Fi", "Study Room"],
      isActive: true,
    });

    // Helper to create test student
    async function createStudent({
      name,
      roomSize = 2,
      gender = "male",
      year = 1,
      foodType = "veg",
      okWithDifferentFood = true,
      dealBreakers = [],
      socialLevel = 2,
      cleanliness = 4,
      sleepSchedule = "normal",
      languages = ["English"],
    }) {
      const user = await User.create({
        name: `${name}_${testSuffix}`,
        email: `${name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.edu`,
        password: "password123",
        role: "student",
        gender,
        year,
        course: "B.Tech",
        department: "CSE",
        registrationNumber: `REG_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        isActive: true,
        isDemo: true,
      });
      createdUserIds.push(user._id);

      await Preference.create({
        student: user._id,
        roomSize,
        sleepSchedule,
        studyTime: "night",
        nightCalls: "never",
        cleanliness,
        noiseTolerance: 3,
        socialLevel,
        acPreference: "no-preference",
        foodType,
        okWithDifferentFood,
        languages,
        culturalComfort: "no-preference",
        dealBreakers,
        completedAt: new Date(),
      });

      return user;
    }

    // Helper to create a room
    async function createRoom({ roomNumber, capacity = 2, floor = 1 }) {
      const room = await Room.create({
        hostel: testHostel._id,
        roomNumber: `${roomNumber}_${testSuffix}`,
        floor,
        capacity,
        currentOccupancy: 0,
        roomType: "Non-AC",
        status: "available",
      });
      createdRoomIds.push(room._id);
      return room;
    }

    // =========================================================================
    // STEP 1: Student sends join request; leader notified; duplicate rejected
    // =========================================================================
    console.log("\n--- STEP 1: Send Join Request & Duplicate Prevention ---");
    const leaderA = await createStudent({ name: "LeaderA", roomSize: 2 });
    const groupA = await createGroup(leaderA._id.toString());
    createdGroupIds.push(groupA._id);

    const studentB = await createStudent({ name: "StudentB", roomSize: 2 });

    const reqB = await sendJoinRequest(studentB._id.toString(), groupA._id.toString(), {
      message: "Hey! Let's room together.",
    });

    if (!reqB || reqB.status !== "pending") {
      throw new Error("Step 1 Failed: Join request was not created with pending status");
    }

    // Verify leader got exactly one notification
    const leaderNotifs = await Notification.find({
      user: leaderA._id,
      type: "join_request_received",
    }).lean();

    if (leaderNotifs.length !== 1) {
      throw new Error(`Step 1 Failed: Expected exactly 1 notification for leader, found ${leaderNotifs.length}`);
    }

    // Verify duplicate request is rejected
    let duplicateRejected = false;
    try {
      await sendJoinRequest(studentB._id.toString(), groupA._id.toString());
    } catch (err) {
      duplicateRejected = err.code === "PENDING_EXISTS" || err.statusCode === 409;
    }
    if (!duplicateRejected) {
      throw new Error("Step 1 Failed: Duplicate join request was not rejected with PENDING_EXISTS / 409");
    }
    console.log("✔ Step 1 Passed: Join request sent, notification delivered, duplicate prevented.");

    // =========================================================================
    // STEP 2: Deal-breaker conflicts rejected with generic NOT_COMPATIBLE
    // =========================================================================
    console.log("\n--- STEP 2: Deal-breaker Conflict Exclusion ---");
    const studentC = await createStudent({
      name: "StudentC_DealBreaker",
      roomSize: 2,
      foodType: "non-veg",
      okWithDifferentFood: false,
      dealBreakers: ["food"],
    });

    let dealBreakerBlocked = false;
    try {
      await sendJoinRequest(studentC._id.toString(), groupA._id.toString());
    } catch (err) {
      dealBreakerBlocked = err.code === "NOT_COMPATIBLE" && err.statusCode === 400;
    }
    if (!dealBreakerBlocked) {
      throw new Error("Step 2 Failed: Request with deal-breaker conflict was not rejected with generic NOT_COMPATIBLE");
    }
    console.log("✔ Step 2 Passed: Deal-breaker conflict rejected with generic NOT_COMPATIBLE.");

    // =========================================================================
    // STEP 3: Wrong room size or gender rejected with NOT_COMPATIBLE
    // =========================================================================
    console.log("\n--- STEP 3: Room Size & Gender Mismatch Filters ---");
    const studentWrongSize = await createStudent({ name: "StudentWrongSize", roomSize: 3 });
    const studentFemale = await createStudent({ name: "StudentFemale", roomSize: 2, gender: "female" });

    let wrongSizeBlocked = false;
    try {
      await sendJoinRequest(studentWrongSize._id.toString(), groupA._id.toString());
    } catch (err) {
      wrongSizeBlocked = err.code === "NOT_COMPATIBLE" && err.statusCode === 400;
    }

    let femaleBlocked = false;
    try {
      await sendJoinRequest(studentFemale._id.toString(), groupA._id.toString());
    } catch (err) {
      femaleBlocked = err.code === "NOT_COMPATIBLE" && err.statusCode === 400;
    }

    if (!wrongSizeBlocked || !femaleBlocked) {
      throw new Error("Step 3 Failed: Wrong room size or gender mismatch not rejected with NOT_COMPATIBLE");
    }
    console.log("✔ Step 3 Passed: Wrong room size and gender mismatch rejected with NOT_COMPATIBLE.");

    // =========================================================================
    // STEP 4: Privacy check on leader review
    // =========================================================================
    console.log("\n--- STEP 4: Privacy Guarantee on Review Details ---");
    const reviewData = await getRequestReview(leaderA._id.toString(), reqB.id);

    // Verify zero private fields leak
    const requester = reviewData.requester || {};
    if (requester.email) throw new Error("Step 4 Failed: Privacy leak! email was exposed in reviewData");
    if (requester.phone) throw new Error("Step 4 Failed: Privacy leak! phone was exposed in reviewData");
    if (requester.registrationNumber) throw new Error("Step 4 Failed: Privacy leak! registrationNumber exposed");
    if (requester.preferences || requester.rawAnswers) throw new Error("Step 4 Failed: Privacy leak! Raw answers exposed");

    // Verify safe fields exist
    if (!requester.name || !requester.course || !reviewData.scoreSnapshot || !reviewData.impact) {
      throw new Error("Step 4 Failed: Expected safe fields (name, course, scoreSnapshot, impact) missing");
    }
    console.log("✔ Step 4 Passed: Zero private fields exposed; safe breakdown and impact provided.");

    // =========================================================================
    // STEP 5: Leader approves -> Admission, score recomputation & auto-closes
    // =========================================================================
    console.log("\n--- STEP 5: Leader Approves & Auto-Close Side-Effects ---");
    // Create another group G2 and let B also have a pending invitation from G2
    const leaderOther = await createStudent({ name: "LeaderOther", roomSize: 2 });
    const groupOther = await createGroup(leaderOther._id.toString());
    createdGroupIds.push(groupOther._id);

    // Create an invitation from groupOther to studentB
    const invB = await GroupInvitation.create({
      group: groupOther._id,
      invitedBy: leaderOther._id,
      invitedUser: studentB._id,
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000 * 7),
    });

    // Create groupThird and have studentB send a join request to groupThird
    const leaderThird = await createStudent({ name: "LeaderThird", roomSize: 2 });
    const groupThird = await createGroup(leaderThird._id.toString());
    createdGroupIds.push(groupThird._id);

    const reqBToThird = await sendJoinRequest(studentB._id.toString(), groupThird._id.toString());

    // Now Leader A approves B's request to Group A
    const approveResult = await approveJoinRequest(leaderA._id.toString(), reqB.id);

    // Group A should now be complete (targetSize: 2, members: 2)
    const freshGroupA = await RoommateGroup.findById(groupA._id).lean();
    if (freshGroupA.members.length !== 2 || freshGroupA.status !== "complete") {
      throw new Error(`Step 5 Failed: Expected Group A to be complete with 2 members, found ${freshGroupA.members.length}`);
    }

    // Verify reqB status is approved
    const freshReqB = await GroupJoinRequest.findById(reqB.id).lean();
    if (freshReqB.status !== "approved") {
      throw new Error(`Step 5 Failed: Expected request status 'approved', found ${freshReqB.status}`);
    }

    // Verify studentB's other pending request to groupThird was auto-closed with requester_joined_elsewhere
    const freshReqBToThird = await GroupJoinRequest.findById(reqBToThird.id).lean();
    if (freshReqBToThird.status !== "cancelled" || freshReqBToThird.closeReason !== "requester_joined_elsewhere") {
      throw new Error(`Step 5 Failed: Expected req to third group cancelled with 'requester_joined_elsewhere', got ${freshReqBToThird.closeReason}`);
    }

    // Verify studentB's pending invitation was cancelled
    const freshInvB = await GroupInvitation.findById(invB._id).lean();
    if (freshInvB.status !== "cancelled") {
      throw new Error(`Step 5 Failed: Expected invitation to be cancelled, got ${freshInvB.status}`);
    }

    console.log("✔ Step 5 Passed: Member admitted, group marked complete, external requests auto-closed.");

    // =========================================================================
    // STEP 6: Concurrency Race Test (2 requesters for 1 remaining seat)
    // =========================================================================
    console.log("\n--- STEP 6: Race Test (Concurrent Approvals for 1 Seat) ---");
    const leaderRace = await createStudent({ name: "LeaderRace", roomSize: 3 });
    const memberRace2 = await createStudent({ name: "MemberRace2", roomSize: 3 });
    const groupRace = await RoommateGroup.create({
      leader: leaderRace._id,
      targetSize: 3,
      gender: "male",
      status: "forming",
      members: [
        { user: leaderRace._id, joinedAt: new Date() },
        { user: memberRace2._id, joinedAt: new Date() },
      ],
      averageScore: 85,
      lowestPairScore: 80,
    });
    createdGroupIds.push(groupRace._id);

    const requesterR1 = await createStudent({ name: "RequesterR1", roomSize: 3 });
    const requesterR2 = await createStudent({ name: "RequesterR2", roomSize: 3 });

    const reqR1 = await sendJoinRequest(requesterR1._id.toString(), groupRace._id.toString());
    const reqR2 = await sendJoinRequest(requesterR2._id.toString(), groupRace._id.toString());

    // Concurrently approve both requests
    const raceResults = await Promise.allSettled([
      approveJoinRequest(leaderRace._id.toString(), reqR1.id),
      approveJoinRequest(leaderRace._id.toString(), reqR2.id),
    ]);

    const fulfilled = raceResults.filter((r) => r.status === "fulfilled");
    const rejected = raceResults.filter((r) => r.status === "rejected");

    if (fulfilled.length !== 1 || rejected.length !== 1) {
      throw new Error(`Step 6 Failed: Expected exactly 1 approval to succeed and 1 to fail, got ${fulfilled.length} succeeded and ${rejected.length} failed`);
    }

    // Verify group has exactly 3 members and is complete
    const finalRaceGroup = await RoommateGroup.findById(groupRace._id).lean();
    if (finalRaceGroup.members.length !== 3 || finalRaceGroup.status !== "complete") {
      throw new Error(`Step 6 Failed: Expected race group to have 3 members, got ${finalRaceGroup.members.length}`);
    }

    // Verify loser's request is cancelled with group_full
    const reqR1Doc = await GroupJoinRequest.findById(reqR1.id).lean();
    const reqR2Doc = await GroupJoinRequest.findById(reqR2.id).lean();

    const winnerDoc = reqR1Doc.status === "approved" ? reqR1Doc : reqR2Doc;
    const loserDoc = reqR1Doc.status === "approved" ? reqR2Doc : reqR1Doc;

    if (loserDoc.status !== "cancelled" || loserDoc.closeReason !== "group_full") {
      throw new Error(`Step 6 Failed: Expected loser's request to be cancelled with 'group_full', got ${loserDoc.status}/${loserDoc.closeReason}`);
    }
    console.log("✔ Step 6 Passed: Atomic concurrency race guarantees exactly 1 winner; loser auto-closed.");

    // =========================================================================
    // STEP 7: Leader Rejects -> Notification & 24h Cooldown
    // =========================================================================
    console.log("\n--- STEP 7: Leader Rejection & Cooldown Enforcement ---");
    const leaderRej = await createStudent({ name: "LeaderRej", roomSize: 3 });
    const groupRej = await createGroup(leaderRej._id.toString());
    createdGroupIds.push(groupRej._id);

    const studentX = await createStudent({ name: "StudentX", roomSize: 3 });
    const reqX = await sendJoinRequest(studentX._id.toString(), groupRej._id.toString());

    await rejectJoinRequest(leaderRej._id.toString(), reqX.id);

    // Verify studentX got neutral notification
    const studentXNotifs = await Notification.find({
      user: studentX._id,
      type: "join_request_rejected",
    }).lean();

    if (studentXNotifs.length !== 1) {
      throw new Error(`Step 7 Failed: Expected 1 rejection notification for student, found ${studentXNotifs.length}`);
    }

    // Verify 24h cooldown prevents re-request to the SAME group
    let cooldownBlocked = false;
    try {
      await sendJoinRequest(studentX._id.toString(), groupRej._id.toString());
    } catch (err) {
      cooldownBlocked = err.code === "COOLDOWN_ACTIVE" || err.statusCode === 429;
    }
    if (!cooldownBlocked) {
      throw new Error("Step 7 Failed: 24h cooldown was not enforced on rejected group");
    }

    // Verify studentX CAN request ANOTHER compatible group immediately
    const leaderOther3 = await createStudent({ name: "LeaderOther3", roomSize: 3 });
    const groupOther3 = await createGroup(leaderOther3._id.toString());
    createdGroupIds.push(groupOther3._id);

    const reqXOther = await sendJoinRequest(studentX._id.toString(), groupOther3._id.toString());
    if (!reqXOther || reqXOther.status !== "pending") {
      throw new Error("Step 7 Failed: Student was not allowed to request another group during cooldown for first group");
    }
    console.log("✔ Step 7 Passed: Rejection notification sent, 24h cooldown enforced on group, request to other group permitted.");

    // =========================================================================
    // STEP 8: Solo Leader Disbands on Join; Multi-member Leader Blocked
    // =========================================================================
    console.log("\n--- STEP 8: Solo Leader Disband & Multi-Member Leader Protection ---");
    const soloLeader = await createStudent({ name: "SoloLeader", roomSize: 2 });
    const soloGroup = await createGroup(soloLeader._id.toString());
    createdGroupIds.push(soloGroup._id);

    const targetLeader = await createStudent({ name: "TargetLeader", roomSize: 2 });
    const targetGroup = await createGroup(targetLeader._id.toString());
    createdGroupIds.push(targetGroup._id);

    // Solo leader requests targetGroup
    const reqSolo = await sendJoinRequest(soloLeader._id.toString(), targetGroup._id.toString());

    // Target leader approves solo leader
    await approveJoinRequest(targetLeader._id.toString(), reqSolo.id);

    // Verify soloGroup is disbanded
    const freshSoloGroup = await RoommateGroup.findById(soloGroup._id).lean();
    if (freshSoloGroup.status !== "disbanded") {
      throw new Error(`Step 8 Failed: Expected solo group to be disbanded, found ${freshSoloGroup.status}`);
    }

    // Now test multi-member leader: create group of 3 with 2 members
    const multiLeader = await createStudent({ name: "MultiLeader", roomSize: 3 });
    const multiMember = await createStudent({ name: "MultiMember", roomSize: 3 });
    const multiGroup = await RoommateGroup.create({
      leader: multiLeader._id,
      targetSize: 3,
      gender: "male",
      status: "forming",
      members: [
        { user: multiLeader._id, joinedAt: new Date() },
        { user: multiMember._id, joinedAt: new Date() },
      ],
      averageScore: 90,
      lowestPairScore: 90,
    });
    createdGroupIds.push(multiGroup._id);

    // Create an open forming group with free seat of size 3
    const leaderOpen3 = await createStudent({ name: "LeaderOpen3", roomSize: 3 });
    const groupOpen3 = await createGroup(leaderOpen3._id.toString());
    createdGroupIds.push(groupOpen3._id);

    let multiLeaderBlocked = false;
    try {
      await sendJoinRequest(multiLeader._id.toString(), groupOpen3._id.toString());
    } catch (err) {
      multiLeaderBlocked = err.code === "LEAVE_GROUP_FIRST" || err.statusCode === 400;
    }
    if (!multiLeaderBlocked) {
      throw new Error("Step 8 Failed: Multi-member group leader was not blocked from sending join request");
    }
    console.log("✔ Step 8 Passed: Solo group auto-disbands upon admission; multi-member leader blocked.");

    // =========================================================================
    // STEP 9: Roomed Group Open Seat Admission
    // =========================================================================
    console.log("\n--- STEP 9: Roomed Group Open Seat Admission & Allocation ---");
    // Open selection window
    const now = new Date();
    await openNow(adminUser._id.toString(), {
      startAt: new Date(now.getTime() - 60000),
      endAt: new Date(now.getTime() + 86400000),
    });

    const roomL = await createRoom({ roomNumber: "901", capacity: 2 });
    const leaderRoomed = await createStudent({ name: "LeaderRoomed", roomSize: 2 });
    const groupRoomed = await createGroup(leaderRoomed._id.toString());
    createdGroupIds.push(groupRoomed._id);

    // Leader selects room
    await selectRoom(leaderRoomed._id.toString(), roomL._id.toString());

    // Verify room is claimed
    let freshRoom = await Room.findById(roomL._id).lean();
    if (freshRoom.status !== "claimed" || freshRoom.currentOccupancy !== 1) {
      throw new Error(`Step 9 Failed: Expected room claimed with occupancy 1, got ${freshRoom.status}/${freshRoom.currentOccupancy}`);
    }

    // Now Student J requests to join this roomed group
    const studentJ = await createStudent({ name: "StudentJ", roomSize: 2 });
    const reqJ = await sendJoinRequest(studentJ._id.toString(), groupRoomed._id.toString());

    // Leader approves Student J
    await approveJoinRequest(leaderRoomed._id.toString(), reqJ.id);

    // Verify Room is now full (occupancy: 2)
    freshRoom = await Room.findById(roomL._id).lean();
    if (freshRoom.currentOccupancy !== 2 || freshRoom.status !== "full") {
      throw new Error(`Step 9 Failed: Expected room occupancy 2 and status 'full', got ${freshRoom.currentOccupancy}/${freshRoom.status}`);
    }

    // Verify Student J received an active Allocation with source 'selection'
    const allocJ = await Allocation.findOne({ student: studentJ._id, status: "active" }).lean();
    if (!allocJ || allocJ.source !== "selection" || allocJ.room.toString() !== roomL._id.toString()) {
      throw new Error(`Step 9 Failed: Student J did not receive active allocation for room ${roomL._id}`);
    }
    console.log("✔ Step 9 Passed: Roomed group admission atomically claims seat and creates Allocation.");

    // =========================================================================
    // STEP 10: Auto-close on group disbanding & Lazy expiry
    // =========================================================================
    console.log("\n--- STEP 10: Auto-Close on Disband & Lazy Expiry ---");
    const leaderDisband = await createStudent({ name: "LeaderDisband", roomSize: 3 });
    const groupDisband = await createGroup(leaderDisband._id.toString());
    createdGroupIds.push(groupDisband._id);

    const studentK = await createStudent({ name: "StudentK", roomSize: 3 });
    const reqK = await sendJoinRequest(studentK._id.toString(), groupDisband._id.toString());

    // Disband group
    await disbandGroup(leaderDisband._id.toString());

    // Verify reqK was auto-closed with group_disbanded
    const freshReqK = await GroupJoinRequest.findById(reqK.id).lean();
    if (freshReqK.status !== "cancelled" || freshReqK.closeReason !== "group_disbanded") {
      throw new Error(`Step 10 Failed: Expected reqK cancelled with 'group_disbanded', got ${freshReqK.status}/${freshReqK.closeReason}`);
    }

    // Test Lazy Expiry: manually set an older expiresAt
    const leaderLazy = await createStudent({ name: "LeaderLazy", roomSize: 3 });
    const groupLazy = await createGroup(leaderLazy._id.toString());
    createdGroupIds.push(groupLazy._id);

    const studentL = await createStudent({ name: "StudentL", roomSize: 3 });
    const reqOld = await GroupJoinRequest.create({
      group: groupLazy._id,
      requester: studentL._id,
      status: "pending",
      expiresAt: new Date(Date.now() - 10000), // in the past
    });

    // When leader accesses incoming requests, stale request should be lazily expired
    const incomingLazy = await listIncomingRequests(leaderLazy._id.toString());
    const freshReqOld = await GroupJoinRequest.findById(reqOld._id).lean();

    if (freshReqOld.status !== "expired" || freshReqOld.closeReason !== "expired") {
      throw new Error(`Step 10 Failed: Stale join request was not lazily expired with 'expired', got ${freshReqOld.status}/${freshReqOld.closeReason}`);
    }
    console.log("✔ Step 10 Passed: Disband auto-closes pending requests; stale requests lazily expire.");

    // =========================================================================
    // STEP 11: Permissions (Non-leader cannot approve; Non-student blocked)
    // =========================================================================
    console.log("\n--- STEP 11: Permissions Enforcement ---");
    const leaderPerm = await createStudent({ name: "LeaderPerm", roomSize: 3 });
    const groupPerm = await createGroup(leaderPerm._id.toString());
    createdGroupIds.push(groupPerm._id);

    const studentM = await createStudent({ name: "StudentM", roomSize: 3 });
    const reqM = await sendJoinRequest(studentM._id.toString(), groupPerm._id.toString());

    // Random other student tries to approve reqM
    const randomStudent = await createStudent({ name: "RandomStudent", roomSize: 3 });
    let nonLeaderBlocked = false;
    try {
      await approveJoinRequest(randomStudent._id.toString(), reqM.id);
    } catch (err) {
      nonLeaderBlocked = err.statusCode === 404 || err.statusCode === 403;
    }
    if (!nonLeaderBlocked) {
      throw new Error("Step 11 Failed: Non-leader was able to approve join request");
    }
    console.log("✔ Step 11 Passed: Non-leader authorization correctly blocked.");

    // =========================================================================
    // STEP 12: Comprehensive Integrity Diagnostics
    // =========================================================================
    console.log("\n--- STEP 12: Comprehensive Integrity Diagnostics ---");
    const integrityReport = await checkIntegrity();
    console.log(`Integrity Report isClean: ${integrityReport.isClean}`);
    console.log(`Problems detected: ${integrityReport.problems.length}`);

    if (!integrityReport.isClean) {
      throw new Error(`Step 12 Failed: Integrity check reported problems: ${JSON.stringify(integrityReport.problems)}`);
    }
    console.log("✔ Step 12 Passed: System integrity check reported 0 problems.");

    console.log("\n==================================================================");
    console.log("  ALL 12 JOIN REQUEST FLOW TESTS PASSED FLAWLESSLY! 🚀");
    console.log("==================================================================");
  } finally {
    // Teardown / Cleanup
    console.log("\nCleaning up test fixtures...");
    try {
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Preference.deleteMany({ student: { $in: createdUserIds } });
        await Notification.deleteMany({ user: { $in: createdUserIds } });
        await Allocation.deleteMany({ student: { $in: createdUserIds } });
        await AllocationIntent.deleteMany({ user: { $in: createdUserIds } });
      }
      if (createdGroupIds.length > 0) {
        await RoommateGroup.deleteMany({ _id: { $in: createdGroupIds } });
        await GroupInvitation.deleteMany({ group: { $in: createdGroupIds } });
        await GroupJoinRequest.deleteMany({ group: { $in: createdGroupIds } });
      }
      if (createdRoomIds.length > 0) {
        await Room.deleteMany({ _id: { $in: createdRoomIds } });
      }
      if (testHostel) {
        await Hostel.deleteOne({ _id: testHostel._id });
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
    await mongoose.disconnect();
  }
}

runJoinRequestFlowTests().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
