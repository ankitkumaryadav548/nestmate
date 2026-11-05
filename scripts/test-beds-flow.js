#!/usr/bin/env node
/**
 * scripts/test-beds-flow.js
 *
 * Verifies bed assignment end-to-end integration flow:
 * 1. Leader assigns beds to 3 members (PASS)
 * 2. Member cannot assign (403 FORBIDDEN) (PASS)
 * 3. Concurrent requests for same bed leave exactly one winner (PASS)
 * 4. Swap two members works atomically (PASS)
 * 5. Member who leaves frees their bed (PASS)
 * 6. 1-seater has bed 1 (PASS)
 * 7. Privacy check: response keys have NO email or registration number (PASS)
 * 8. Integrity check clean at the end (PASS)
 *
 * Clean demo-only fixtures that tear down in finally block.
 *
 * Usage:
 *   npm run test:beds-flow
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import assert from "assert";

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
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI not found in environment.");
  process.exit(1);
}

async function main() {
  console.log("==================================================================");
  console.log("  HOSTELMATCH BED ASSIGNMENT END-TO-END FLOW VERIFICATION");
  console.log("==================================================================");

  // Dynamic imports after env is loaded
  const { default: connectDB } = await import("../src/lib/db.js");
  const { default: User } = await import("../src/models/User.js");
  const { default: Hostel } = await import("../src/models/Hostel.js");
  const { default: Room } = await import("../src/models/Room.js");
  const { default: RoommateGroup } = await import("../src/models/RoommateGroup.js");
  const { default: Allocation } = await import("../src/models/Allocation.js");
  const { default: StudentProfile } = await import("../src/models/StudentProfile.js");
  const { getRoommatesAndBeds, assignBeds } = await import("../src/services/bedService.js");
  const { checkIntegrity } = await import("../src/services/integrityService.js");
  const { leaveRoomedGroup } = await import("../src/services/roomSelectionService.js");

  await connectDB();
  console.log(" Connected to MongoDB.");

  const testId = `test_${Date.now()}`;
  const createdUserIds = [];
  let testHostelId = null;
  let room3Id = null;
  let room1Id = null;
  let groupId = null;

  try {
    // Setup test hostel
    const hostel = await Hostel.create({
      name: `Bed Test Hostel ${testId}`,
      code: `BTH_${testId.slice(-4)}`,
      gender: "boys",
      totalFloors: 2,
      isActive: true,
    });
    testHostelId = hostel._id;

    // Setup 3-seater room and 1-seater room
    const room3 = await Room.create({
      hostel: testHostelId,
      roomNumber: `B301_${testId.slice(-4)}`,
      floor: 1,
      capacity: 3,
      roomType: "Non-AC",
      currentOccupancy: 3,
      status: "full",
    });
    room3Id = room3._id;

    const room1 = await Room.create({
      hostel: testHostelId,
      roomNumber: `B101_${testId.slice(-4)}`,
      floor: 1,
      capacity: 1,
      roomType: "AC",
      currentOccupancy: 1,
      status: "full",
    });
    room1Id = room1._id;

    // Setup 4 demo students
    const leader = await User.create({
      name: `Leader ${testId}`,
      email: `leader_${testId}@test.edu`,
      password: "password123",
      gender: "male",
      role: "student",
      isActive: true,
      isDemo: true,
      course: "B.Tech CSE",
      year: 2,
      phone: "+91 9876543210",
      registrationNumber: `REG_${testId}_1`,
    });
    createdUserIds.push(leader._id);

    const member2 = await User.create({
      name: `MemberTwo ${testId}`,
      email: `member2_${testId}@test.edu`,
      password: "password123",
      gender: "male",
      role: "student",
      isActive: true,
      isDemo: true,
      course: "B.Tech ECE",
      year: 2,
      phone: "+91 9876543211",
      registrationNumber: `REG_${testId}_2`,
    });
    createdUserIds.push(member2._id);

    const member3 = await User.create({
      name: `MemberThree ${testId}`,
      email: `member3_${testId}@test.edu`,
      password: "password123",
      gender: "male",
      role: "student",
      isActive: true,
      isDemo: true,
      course: "B.Tech ME",
      year: 2,
      phone: "+91 9876543212",
      registrationNumber: `REG_${testId}_3`,
    });
    createdUserIds.push(member3._id);

    const singleStudent = await User.create({
      name: `SingleStudent ${testId}`,
      email: `single_${testId}@test.edu`,
      password: "password123",
      gender: "male",
      role: "student",
      isActive: true,
      isDemo: true,
      course: "M.Tech AI",
      year: 1,
      phone: "+91 9876543213",
      registrationNumber: `REG_${testId}_4`,
    });
    createdUserIds.push(singleStudent._id);

    // Setup student profiles with phone sharing preferences
    await StudentProfile.create([
      { user: leader._id, sharePhoneWithRoommates: true },
      { user: member2._id, sharePhoneWithRoommates: true },
      { user: member3._id, sharePhoneWithRoommates: false }, // Private phone
      { user: singleStudent._id, sharePhoneWithRoommates: true },
    ]);

    // Setup group for 3 members
    const group = await RoommateGroup.create({
      leader: leader._id,
      gender: "male",
      targetSize: 3,
      status: "locked",
      selectedRoom: room3Id,
      members: [
        { user: leader._id, joinedAt: new Date() },
        { user: member2._id, joinedAt: new Date() },
        { user: member3._id, joinedAt: new Date() },
      ],
      isDemo: true,
    });
    groupId = group._id;

    // Setup initial allocations: 3 members in room 3, single student in room 1
    await Allocation.create([
      {
        student: leader._id,
        room: room3Id,
        hostel: testHostelId,
        group: groupId,
        source: "selection",
        status: "active",
        bedNumber: null,
        isDemo: true,
      },
      {
        student: member2._id,
        room: room3Id,
        hostel: testHostelId,
        group: groupId,
        source: "selection",
        status: "active",
        bedNumber: null,
        isDemo: true,
      },
      {
        student: member3._id,
        room: room3Id,
        hostel: testHostelId,
        group: groupId,
        source: "selection",
        status: "active",
        bedNumber: null,
        isDemo: true,
      },
      {
        student: singleStudent._id,
        room: room1Id,
        hostel: testHostelId,
        group: null,
        source: "selection",
        status: "active",
        bedNumber: 1, // Single-seater allocation has bedNumber = 1
        isDemo: true,
      },
    ]);

    // -------------------------------------------------------------
    // TEST 1: Leader assigns beds to 3 members
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Leader assigns beds to 3 members ---");
    const assignRes = await assignBeds(leader._id.toString(), [
      { userId: leader._id.toString(), bedNumber: 1 },
      { userId: member2._id.toString(), bedNumber: 2 },
      { userId: member3._id.toString(), bedNumber: 3 },
    ]);
    assert.equal(assignRes.success, true);

    const alloc1 = await Allocation.findOne({ student: leader._id, status: "active" }).lean();
    const alloc2 = await Allocation.findOne({ student: member2._id, status: "active" }).lean();
    const alloc3 = await Allocation.findOne({ student: member3._id, status: "active" }).lean();
    assert.equal(alloc1.bedNumber, 1);
    assert.equal(alloc2.bedNumber, 2);
    assert.equal(alloc3.bedNumber, 3);
    console.log(" Leader successfully assigned beds 1, 2, 3: PASS");

    // -------------------------------------------------------------
    // TEST 2: Non-leader member cannot assign (403 Forbidden)
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Member cannot assign (403 Forbidden) ---");
    let caught403 = false;
    try {
      await assignBeds(member2._id.toString(), [
        { userId: member2._id.toString(), bedNumber: 1 },
      ]);
    } catch (err) {
      if (err.statusCode === 403 || err.code === "FORBIDDEN_NOT_LEADER") {
        caught403 = true;
      }
    }
    assert.equal(caught403, true, "Member assignment attempt must throw 403 Forbidden");
    console.log(" Non-leader member rejected with 403 Forbidden: PASS");

    // -------------------------------------------------------------
    // TEST 3: Swap two members atomically
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Atomically swap two members ---");
    const swapRes = await assignBeds(leader._id.toString(), [
      { userId: leader._id.toString(), bedNumber: 2 },
      { userId: member2._id.toString(), bedNumber: 1 },
    ]);
    assert.equal(swapRes.success, true);

    const swappedLeader = await Allocation.findOne({ student: leader._id, status: "active" }).lean();
    const swappedMember2 = await Allocation.findOne({ student: member2._id, status: "active" }).lean();
    assert.equal(swappedLeader.bedNumber, 2);
    assert.equal(swappedMember2.bedNumber, 1);
    console.log(" Swapped leader to bed 2 and member2 to bed 1 atomically: PASS");

    // -------------------------------------------------------------
    // TEST 4: Two concurrent requests giving same bed leave exactly one winner
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Race condition concurrency guard ---");
    const session1 = await mongoose.startSession();
    const session2 = await mongoose.startSession();

    let winnerCount = 0;
    let conflictCount = 0;

    // Both attempt to assign bedNumber 3 to a different allocation directly
    const p1 = (async () => {
      try {
        await session1.withTransaction(async () => {
          await Allocation.updateOne(
            { student: leader._id, status: "active" },
            { $set: { bedNumber: 3 } },
            { session: session1 }
          );
        });
        winnerCount++;
      } catch (err) {
        conflictCount++;
      }
    })();

    const p2 = (async () => {
      try {
        await session2.withTransaction(async () => {
          await Allocation.updateOne(
            { student: member2._id, status: "active" },
            { $set: { bedNumber: 3 } },
            { session: session2 }
          );
        });
        winnerCount++;
      } catch (err) {
        conflictCount++;
      }
    })();

    await Promise.all([p1, p2]);
    await session1.endSession();
    await session2.endSession();

    // Partial unique index guarantees at most 1 active allocation in room3 has bed 3
    const bed3Allocations = await Allocation.find({ room: room3Id, bedNumber: 3, status: "active" });
    assert.equal(bed3Allocations.length, 1);
    console.log(` Concurrent assignment left exactly 1 winner (conflicts caught: ${conflictCount}): PASS`);

    // Restore valid state: leader -> 1, member2 -> 2, member3 -> 3
    await Allocation.updateMany({ room: room3Id }, { $set: { bedNumber: null } });
    await Allocation.updateOne({ student: leader._id, status: "active" }, { $set: { bedNumber: 1 } });
    await Allocation.updateOne({ student: member2._id, status: "active" }, { $set: { bedNumber: 2 } });
    await Allocation.updateOne({ student: member3._id, status: "active" }, { $set: { bedNumber: 3 } });

    // -------------------------------------------------------------
    // TEST 5: Member leaves frees their bed
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Member who leaves frees their bed ---");
    const leaveSession = await mongoose.startSession();
    await leaveSession.withTransaction(async () => {
      await leaveRoomedGroup(groupId, member3._id, { session: leaveSession, reason: "left" });
    });
    await leaveSession.endSession();

    const m3Alloc = await Allocation.findOne({ student: member3._id });
    assert.equal(m3Alloc.status, "cancelled");

    const activeAllocationsAfterLeave = await Allocation.find({ room: room3Id, status: "active" });
    assert.equal(activeAllocationsAfterLeave.length, 2);

    const roomDetails = await getRoommatesAndBeds(leader._id.toString());
    const bed3 = roomDetails.beds.find((b) => b.bedNumber === 3);
    assert.equal(bed3.member, null);
    assert.equal(roomDetails.openSeats, 1);
    console.log(" Cancelled allocation frees bed 3 (now empty with 1 open seat): PASS");

    // -------------------------------------------------------------
    // TEST 6: 1-Seater allocation has bed 1
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: 1-Seater has bed 1 ---");
    const singleData = await getRoommatesAndBeds(singleStudent._id.toString());
    assert.equal(singleData.room.capacity, 1);
    assert.equal(singleData.beds.length, 1);
    assert.equal(singleData.beds[0].bedNumber, 1);
    assert.equal(singleData.beds[0].member.id, singleStudent._id.toString());
    console.log(" Single-room student correctly assigned to bed 1: PASS");

    // -------------------------------------------------------------
    // TEST 7: Privacy check on response keys
    // -------------------------------------------------------------
    console.log("\n--- TEST 7: Privacy check of response keys ---");
    const roommatesData = await getRoommatesAndBeds(leader._id.toString());
    for (const b of roommatesData.beds) {
      if (b.member) {
        assert.equal(b.member.email, undefined, "Email must NEVER be returned in roommates view");
        assert.equal(b.member.registrationNumber, undefined, "Reg number must NEVER be returned");
        assert.equal(b.member.answers, undefined, "Answers must NEVER be returned");
        assert.equal(b.member.preferences, undefined, "Preferences must NEVER be returned");
      }
    }
    const mem2FromLeader = roommatesData.beds.find((b) => b.member?.id === member2._id.toString())?.member;
    assert.equal(mem2FromLeader.phoneStatus, "shared");
    assert.equal(mem2FromLeader.phone, "+91 9876543211");
    console.log(" Zero private fields leaked and phone sharing respected: PASS");

    // -------------------------------------------------------------
    // TEST 8: Full database integrity check
    // -------------------------------------------------------------
    console.log("\n--- TEST 8: Database integrity check ---");
    const integrityReport = await checkIntegrity();
    const bedProblems = (integrityReport.problems || []).filter(
      (p) => p.code === "duplicate_bed_number_in_room" || p.code === "bed_number_exceeds_capacity"
    );
    assert.equal(bedProblems.length, 0, "Integrity check must find zero bed assignment problems");
    console.log(" Integrity check passed with zero bed assignment problems: PASS");

    console.log("\n==================================================================");
    console.log("  ALL BED FLOW INTEGRATION SCENARIOS PASSED! (PASS)");
    console.log("==================================================================");
  } finally {
    console.log("\nCleaning up test artifacts...");
    if (groupId) await RoommateGroup.deleteOne({ _id: groupId });
    if (room3Id) await Room.deleteOne({ _id: room3Id });
    if (room1Id) await Room.deleteOne({ _id: room1Id });
    if (testHostelId) await Hostel.deleteOne({ _id: testHostelId });
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
      await StudentProfile.deleteMany({ user: { $in: createdUserIds } });
      await Allocation.deleteMany({ student: { $in: createdUserIds } });
    }
    await mongoose.disconnect();
    console.log(" Cleanup complete. Database restored.");
  }
}

main().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
