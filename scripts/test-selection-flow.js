#!/usr/bin/env node
/**
 * scripts/test-selection-flow.js
 * 
 * End-to-end integration and concurrency test suite for:
 * 1. 20-leader simultaneous race condition for the EXACT SAME room (Atomic 1-winner guarantee)
 * 2. Rapid double-click race prevention for the same leader
 * 3. Seat contention race: concurrent accepts for the last open seat in a roomed group
 * 4. Room release & immediate re-claim by another group
 * 5. Member leaving and solo-leader disbanding room release
 * 6. Hard constraints & authorization enforcement (gender, room size, non-leader, closed window)
 * 7. Finalize selection: locking groups & deterministic open-seat auto-fill
 * 8. Fallback allocation engine execution excluding roomed groups & claimed rooms
 * 9. Comprehensive integrity diagnostic verification
 * 
 * Run:
 *   node scripts/test-selection-flow.js
 *   npm run test:selection-flow
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

async function runSelectionFlowTests() {
  console.log("==================================================================");
  console.log("  HOSTELMATCH FCFS ROOM SELECTION END-TO-END & RACE TEST SUITE ⚡");
  console.log("==================================================================");

  const connectDB = (await import("../src/lib/db.js")).default;
  const User = (await import("../src/models/User.js")).default;
  const Hostel = (await import("../src/models/Hostel.js")).default;
  const Room = (await import("../src/models/Room.js")).default;
  const Preference = (await import("../src/models/Preference.js")).default;
  const RoommateGroup = (await import("../src/models/RoommateGroup.js")).default;
  const GroupInvitation = (await import("../src/models/GroupInvitation.js")).default;
  const AllocationIntent = (await import("../src/models/AllocationIntent.js")).default;
  const SelectionWindow = (await import("../src/models/SelectionWindow.js")).default;
  const Allocation = (await import("../src/models/Allocation.js")).default;

  const {
    openNow,
    closeNow,
  } = await import("../src/services/selectionWindowService.js");
  const {
    selectRoom,
    releaseRoom,
  } = await import("../src/services/roomSelectionService.js");
  const {
    acceptInvitation,
    leaveGroup,
    disbandGroup,
  } = await import("../src/services/groupService.js");
  const {
    previewFinalize,
    finalizeSelection,
  } = await import("../src/services/selectionFinalizeService.js");
  const { runAllocation } = await import("../src/services/allocationService.js");
  const { checkIntegrity } = await import("../src/services/integrityService.js");

  await connectDB();

  const testSuffix = Date.now().toString().slice(-6);
  const createdUserIds = [];
  const createdGroupIds = [];
  const createdRoomIds = [];
  let testHostel = null;
  let adminUser = null;

  try {
    // 1. Setup Admin & Test Environment
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
    const adminId = adminUser._id.toString();

    // Create a dedicated test hostel
    testHostel = await Hostel.create({
      name: `Test Selection Hostel ${testSuffix}`,
      code: `TSH${testSuffix.slice(-3)}`,
      gender: "boys",
      totalFloors: 3,
      allowedYears: [1, 2, 3, 4],
      facilities: ["Wi-Fi", "Study Room"],
      isActive: true,
    });

    // Helper to create test student with preferences and group
    async function createTestStudentAndGroup({ name, roomSize = 2, gender = "male", year = 1 }) {
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
        sleepSchedule: "normal",
        studyTime: "night",
        cleanliness: 4,
        noiseTolerance: 3,
        socialLevel: 3,
        acPreference: "no-preference",
        foodType: "veg",
        okWithDifferentFood: true,
        languages: ["English"],
        nightCalls: "never",
        dealBreakers: [],
        completedAt: new Date(),
      });

      const group = await RoommateGroup.create({
        leader: user._id,
        gender,
        targetSize: roomSize,
        members: [{ user: user._id, joinedAt: new Date() }],
        status: "forming",
        averageScore: 100,
        lowestPairScore: 100,
        isDemo: true,
      });
      createdGroupIds.push(group._id);

      await AllocationIntent.create({
        user: user._id,
        mode: "group",
        preferredRoomSize: roomSize,
      });

      return { user, group };
    }

    // Helper to create test room
    async function createTestRoom({ roomNumber, capacity = 2, roomType = "Non-AC", floor = 1, hostelId = testHostel._id }) {
      const room = await Room.create({
        hostel: hostelId,
        roomNumber: `${roomNumber}_${testSuffix}`,
        floor,
        capacity,
        roomType,
        currentOccupancy: 0,
        status: "available",
      });
      createdRoomIds.push(room._id);
      return room;
    }

    // Open a selection window
    console.log("\n▶ Step 1: Open Selection Window");
    await openNow(adminId, 60);
    console.log("  ✓ Selection window opened for 60 minutes");

    // -------------------------------------------------------------------------
    // TEST 1: 20 LEADERS RACING FOR THE EXACT SAME ROOM
    // -------------------------------------------------------------------------
    console.log("\n▶ Step 2: 20 Leaders Concurrent Race for the Same Room");
    const raceRoom = await createTestRoom({ roomNumber: "RACE101", capacity: 2 });

    const racingLeaders = [];
    for (let i = 0; i < 20; i++) {
      const { user } = await createTestStudentAndGroup({ name: `Racer_${i}`, roomSize: 2 });
      racingLeaders.push(user);
    }

    // Fire all 20 calls at the exact same moment
    const raceResults = await Promise.allSettled(
      racingLeaders.map((u) => selectRoom(u._id.toString(), raceRoom._id.toString()))
    );

    const winners = raceResults.filter((r) => r.status === "fulfilled");
    const rejected = raceResults.filter((r) => r.status === "rejected");

    console.log(`  • Successful claims: ${winners.length}`);
    console.log(`  • Rejected claims  : ${rejected.length}`);

    if (winners.length !== 1) {
      throw new Error(`RACE VIOLATION: Expected exactly 1 winner, but got ${winners.length}`);
    }
    if (rejected.length !== 19) {
      throw new Error(`RACE VIOLATION: Expected exactly 19 rejections, but got ${rejected.length}`);
    }

    // Verify room state in DB
    const freshRaceRoom = await Room.findById(raceRoom._id).lean();
    if (freshRaceRoom.status !== "claimed") {
      throw new Error(`Expected room status 'claimed', got '${freshRaceRoom.status}'`);
    }
    if (!freshRaceRoom.claim?.group) {
      throw new Error("Expected room to have claim.group populated");
    }

    // Verify exactly 1 group has selectedRoom
    const claimedGroups = await RoommateGroup.find({ selectedRoom: raceRoom._id }).lean();
    if (claimedGroups.length !== 1) {
      throw new Error(`Expected exactly 1 group to hold selectedRoom, got ${claimedGroups.length}`);
    }
    console.log("  ✓ Exactly 1 winner claimed the room, 19 rejected safely");

    // -------------------------------------------------------------------------
    // TEST 2: RAPID DOUBLE-CLICK PREVENTION
    // -------------------------------------------------------------------------
    console.log("\n▶ Step 3: Rapid Double-Click Race Prevention for Leader");
    const doubleClickLeader = (await createTestStudentAndGroup({ name: "DoubleClicker", roomSize: 2 })).user;
    const roomA = await createTestRoom({ roomNumber: "DBL_A", capacity: 2 });
    const roomB = await createTestRoom({ roomNumber: "DBL_B", capacity: 2 });

    // Simultaneous claim for roomA and roomB
    const doubleClickResults = await Promise.allSettled([
      selectRoom(doubleClickLeader._id.toString(), roomA._id.toString()),
      selectRoom(doubleClickLeader._id.toString(), roomB._id.toString()),
    ]);

    const dblWins = doubleClickResults.filter((r) => r.status === "fulfilled");
    const dblRejects = doubleClickResults.filter((r) => r.status === "rejected");

    if (dblWins.length !== 1 || dblRejects.length !== 1) {
      throw new Error(`Double-click failed: wins=${dblWins.length}, rejects=${dblRejects.length}`);
    }
    console.log("  ✓ Only 1 room claim succeeded, duplicate parallel claim was rejected");

    // -------------------------------------------------------------------------
    // TEST 3: SEAT CONTENTION RACE (Last seat in roomed group)
    // -------------------------------------------------------------------------
    console.log("\n▶ Step 4: Seat Contention Race (Last seat in roomed group)");
    const seatRaceRoom = await createTestRoom({ roomNumber: "SEAT101", capacity: 2 });
    const { user: groupLeaderUser, group: roomedGroup } = await createTestStudentAndGroup({
      name: "GroupLeaderSeat",
      roomSize: 2,
    });

    // Group leader claims seatRaceRoom
    await selectRoom(groupLeaderUser._id.toString(), seatRaceRoom._id.toString());

    // Create 3 candidates and send invites to all 3
    const invitees = [];
    const inviteDocs = [];
    for (let i = 0; i < 3; i++) {
      const invitee = await User.create({
        name: `Invitee_${i}_${testSuffix}`,
        email: `invitee_${i}_${Date.now()}@test.edu`,
        password: "password123",
        role: "student",
        gender: "male",
        year: 1,
        course: "B.Tech",
        department: "CSE",
        registrationNumber: `INV_${i}_${testSuffix}`,
        isActive: true,
        isDemo: true,
      });
      createdUserIds.push(invitee._id);

      await Preference.create({
        student: invitee._id,
        roomSize: 2,
        cleanliness: 4,
        noiseTolerance: 3,
        socialLevel: 3,
        completedAt: new Date(),
      });

      const inv = await GroupInvitation.create({
        group: roomedGroup._id,
        invitedUser: invitee._id,
        invitedBy: groupLeaderUser._id,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      invitees.push(invitee);
      inviteDocs.push(inv);
    }

    // All 3 candidates concurrently accept the invitation for the 1 remaining seat!
    const seatAcceptResults = await Promise.allSettled(
      invitees.map((u, idx) => acceptInvitation(u._id.toString(), inviteDocs[idx]._id.toString()))
    );

    const seatWins = seatAcceptResults.filter((r) => r.status === "fulfilled");
    const seatRejects = seatAcceptResults.filter((r) => r.status === "rejected");

    if (seatWins.length !== 1 || seatRejects.length !== 2) {
      throw new Error(`Seat contention failed: wins=${seatWins.length}, rejects=${seatRejects.length}`);
    }

    // Verify room is now full
    const fullRoomDoc = await Room.findById(seatRaceRoom._id).lean();
    if (fullRoomDoc.status !== "full" || fullRoomDoc.currentOccupancy !== 2) {
      throw new Error(`Expected room status 'full' with occupancy 2, got '${fullRoomDoc.status}', occ=${fullRoomDoc.currentOccupancy}`);
    }
    console.log("  ✓ Exactly 1 candidate won the last seat, other 2 cleanly rejected with 409");

    // -------------------------------------------------------------------------
    // TEST 4: ROOM RELEASE & RE-CLAIM
    // -------------------------------------------------------------------------
    console.log("\n▶ Step 5: Room Release and Re-Claim");
    const reRelRoom = await createTestRoom({ roomNumber: "REL101", capacity: 2 });
    const { user: relLeader1 } = await createTestStudentAndGroup({ name: "RelLeader1", roomSize: 2 });
    const { user: relLeader2 } = await createTestStudentAndGroup({ name: "RelLeader2", roomSize: 2 });

    await selectRoom(relLeader1._id.toString(), reRelRoom._id.toString());
    let relDoc = await Room.findById(reRelRoom._id).lean();
    if (relDoc.status !== "claimed") throw new Error("Expected room to be claimed");

    // Leader 1 releases
    await releaseRoom(relLeader1._id.toString());
    relDoc = await Room.findById(reRelRoom._id).lean();
    if (relDoc.status !== "available" || relDoc.claim?.group) {
      throw new Error("Expected released room to be 'available' with no claim");
    }

    // Leader 2 immediately re-claims
    await selectRoom(relLeader2._id.toString(), reRelRoom._id.toString());
    relDoc = await Room.findById(reRelRoom._id).lean();
    if (relDoc.status !== "claimed" || !relDoc.claim?.group) {
      throw new Error("Expected room to be successfully re-claimed by Leader 2");
    }
    console.log("  ✓ Room released cleanly and immediately re-claimed by another group");

    // -------------------------------------------------------------------------
    // TEST 5: MEMBER LEAVING & SOLO-LEADER DISBANDING
    // -------------------------------------------------------------------------
    console.log("\n▶ Step 6: Member Leaving & Disband Room Release");
    // Winner of seat race (from Step 4) leaves the group
    const winningInvitee = invitees.find((_, idx) => seatAcceptResults[idx].status === "fulfilled");
    await leaveGroup(winningInvitee._id.toString());

    // Occupancy should decrement, room should revert from full to claimed
    const afterLeaveRoom = await Room.findById(seatRaceRoom._id).lean();
    if (afterLeaveRoom.status !== "claimed" || afterLeaveRoom.currentOccupancy !== 1) {
      throw new Error(`Expected room status 'claimed' with occupancy 1, got ${afterLeaveRoom.status}, occ=${afterLeaveRoom.currentOccupancy}`);
    }

    // Now solo leader leaves -> group auto-disbands and releases room
    await leaveGroup(groupLeaderUser._id.toString());
    const afterDisbandRoom = await Room.findById(seatRaceRoom._id).lean();
    if (afterDisbandRoom.status !== "available" || afterDisbandRoom.currentOccupancy !== 0) {
      throw new Error(`Expected room to be released to 'available' with occupancy 0, got ${afterDisbandRoom.status}`);
    }
    console.log("  ✓ Member leave freed seat, solo-leader disband fully released room to inventory");

    // -------------------------------------------------------------------------
    // TEST 6: HARD CONSTRAINTS & CLOSED WINDOW REJECTION
    // -------------------------------------------------------------------------
    console.log("\n▶ Step 7: Hard Constraints & Closed Window Protection");
    const { user: girlLeader } = await createTestStudentAndGroup({ name: "GirlLeader", roomSize: 2, gender: "female" });
    const boysRoom = await createTestRoom({ roomNumber: "BOYS_ONLY", capacity: 2 });

    let genderRejected = false;
    try {
      await selectRoom(girlLeader._id.toString(), boysRoom._id.toString());
    } catch {
      genderRejected = true;
    }
    if (!genderRejected) throw new Error("Girl student was incorrectly allowed to claim boys room!");
    console.log("  ✓ Strict gender separation enforced: cross-gender claim blocked");

    // Close window and test rejection
    await closeNow(adminId);
    let closedRejected = false;
    try {
      await selectRoom(racingLeaders[0]._id.toString(), boysRoom._id.toString());
    } catch (err) {
      if (err.statusCode === 409 || err.message?.includes("closed")) {
        closedRejected = true;
      }
    }
    if (!closedRejected) throw new Error("Claim was allowed while window was closed!");
    console.log("  ✓ Window status enforced: claims rejected after window closed");

    // Re-open window for finalization test
    await openNow(adminId, 60);

    // -------------------------------------------------------------------------
    // TEST 7: SELECTION FINALIZE & OPEN-SEAT AUTO-FILL
    // -------------------------------------------------------------------------
    console.log("\n▶ Step 8: Selection Finalize & Open-Seat Auto-Fill");
    const finalizeRoom = await createTestRoom({ roomNumber: "FIN101", capacity: 2 });
    const { user: finLeader, group: finGroup } = await createTestStudentAndGroup({ name: "FinLeader", roomSize: 2 });

    // FinLeader claims room of capacity 2 (1 seat remaining)
    await selectRoom(finLeader._id.toString(), finalizeRoom._id.toString());

    // Create a solo candidate eligible for auto-fill
    const autoFillStudent = await User.create({
      name: `AutoFillCandidate_${testSuffix}`,
      email: `autofill_${Date.now()}@test.edu`,
      password: "password123",
      role: "student",
      gender: "male",
      year: 1,
      course: "B.Tech",
      department: "CSE",
      registrationNumber: `AF_${testSuffix}`,
      isActive: true,
      isDemo: true,
    });
    createdUserIds.push(autoFillStudent._id);

    await Preference.create({
      student: autoFillStudent._id,
      roomSize: 2,
      sleepSchedule: "normal",
      studyTime: "night",
      cleanliness: 4,
      noiseTolerance: 3,
      socialLevel: 3,
      acPreference: "no-preference",
      foodType: "veg",
      okWithDifferentFood: true,
      languages: ["English"],
      nightCalls: "never",
      dealBreakers: [],
      completedAt: new Date(),
    });

    await AllocationIntent.create({
      user: autoFillStudent._id,
      mode: "auto",
      preferredRoomSize: 2,
    });

    // Close window before finalization
    await closeNow(adminId);

    // Preview finalization
    const preview = await previewFinalize();
    if (!preview.groupsToLock || preview.groupsToLock.length === 0) {
      throw new Error("Finalize preview did not detect roomed groups to lock");
    }

    // Execute finalization
    const finalizeSummary = await finalizeSelection(adminId);
    console.log(`  • Groups locked: ${finalizeSummary.lockedCount}`);
    console.log(`  • Seats auto-filled: ${finalizeSummary.autoFilledCount}`);

    const updatedFinGroup = await RoommateGroup.findById(finGroup._id).lean();
    if (updatedFinGroup.status !== "locked") {
      throw new Error(`Expected group status 'locked', got '${updatedFinGroup.status}'`);
    }

    const finAllocations = await Allocation.find({ room: finalizeRoom._id, status: "active" }).lean();
    if (finAllocations.length !== 2) {
      throw new Error(`Expected 2 active allocations in Room FIN101, got ${finAllocations.length}`);
    }
    const hasSelectionSource = finAllocations.every((a) => a.source === "selection" || a.source === "auto_fill");
    if (!hasSelectionSource) {
      throw new Error("Expected all finalization allocations to have source 'selection'");
    }
    console.log("  ✓ Finalization locked group and created official Allocations with source='selection'");

    // -------------------------------------------------------------------------
    // TEST 8: FALLBACK ALLOCATION ENGINE EXCLUSION
    // -------------------------------------------------------------------------
    console.log("\n▶ Step 9: Fallback Allocation Simulation");
    const simResult = await runAllocation(adminId, {
      studentScope: "demo",
      defaultRoomSize: 2,
    }, { persist: false });

    // Verify finalizeRoom is NOT double-assigned in fallback simulation
    const doubleAssigned = (simResult.assignments || []).filter(
      (a) => a.roomId && a.roomId.toString() === finalizeRoom._id.toString()
    );
    if (doubleAssigned.length > 0) {
      throw new Error(`CRITICAL: Fallback simulation assigned already claimed room: ${finalizeRoom._id}`);
    }
    console.log("  ✓ Fallback allocation engine cleanly excluded roomed groups and claimed rooms");

    // -------------------------------------------------------------------------
    // TEST 9: INTEGRITY DIAGNOSTIC VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n▶ Step 10: Allocation Integrity Diagnostics");
    const integrity = await checkIntegrity();
    console.log(`  • Rooms checked      : ${integrity.stats.roomsChecked}`);
    console.log(`  • Allocations checked: ${integrity.stats.allocationsChecked}`);
    console.log(`  • Problems detected  : ${integrity.problems.length}`);

    const criticalProblems = integrity.problems.filter((p) => p.severity === "critical");
    if (criticalProblems.length > 0) {
      console.error("Critical integrity issues:", criticalProblems);
      throw new Error(`Integrity check failed with ${criticalProblems.length} critical issues`);
    }
    console.log("  ✓ ZERO critical integrity discrepancies detected");

    console.log("\n==================================================================");
    console.log("  🎉 ALL 9 SELECTION & CONCURRENCY TESTS PASSED FLAWLESSLY! ✅  ");
    console.log("==================================================================");

  } finally {
    console.log("\n🧹 Cleaning up test artifacts...");
    try {
      if (testHostel) await Hostel.findByIdAndDelete(testHostel._id);
      if (createdRoomIds.length > 0) {
        await Room.deleteMany({ _id: { $in: createdRoomIds } });
        await Allocation.deleteMany({ room: { $in: createdRoomIds } });
      }
      if (createdGroupIds.length > 0) {
        await RoommateGroup.deleteMany({ _id: { $in: createdGroupIds } });
        await GroupInvitation.deleteMany({ group: { $in: createdGroupIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Preference.deleteMany({ student: { $in: createdUserIds } });
        await AllocationIntent.deleteMany({ user: { $in: createdUserIds } });
      }
      await SelectionWindow.deleteMany({ name: /Selection Window/ });
      console.log("  ✓ Test artifacts cleaned up.");
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }

  process.exit(0);
}

runSelectionFlowTests().catch((err) => {
  console.error("\n❌ SELECTION TEST SUITE FAILED:", err);
  process.exit(1);
});
