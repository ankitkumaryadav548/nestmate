/**
 * Allocation Integrity Diagnostic & Self-Healing Service (Phase 6)
 * 
 * Verifies and repairs invariants across:
 * - Physical room occupancy vs. active Allocation documents
 * - Single active allocation per student guarantee
 * - Group status synchronization with official allocations
 * - Publication snapshot completeness on published runs
 */

import connectDB from "../lib/db.js";
import Room from "../models/Room.js";
import Allocation from "../models/Allocation.js";
import RoommateGroup from "../models/RoommateGroup.js";
import AllocationRun from "../models/AllocationRun.js";

/**
 * Executes a full diagnostic suite across all allocation data structures.
 * 
 * @returns {Promise<{
 *   isClean: boolean,
 *   problems: Array<{ code: string, severity: "critical" | "warning", message: string, entityId?: string }>,
 *   stats: { roomsChecked: number, allocationsChecked: number, groupsChecked: number, publishedRunsChecked: number }
 * }>}
 */
export async function checkIntegrity() {
  await connectDB();

  const problems = [];

  const [rooms, activeAllocations, lockedGroups, publishedRuns] = await Promise.all([
    Room.find().lean(),
    Allocation.find({ status: "active" }).lean(),
    RoommateGroup.find({ status: "locked" }).lean(),
    AllocationRun.find({ status: "published" }).lean(),
  ]);

  // 1. Check room occupancy against active allocations count
  const activeCountByRoom = new Map();
  for (const a of activeAllocations) {
    const rId = String(a.room);
    activeCountByRoom.set(rId, (activeCountByRoom.get(rId) || 0) + 1);
  }

  for (const room of rooms) {
    const actualCount = activeCountByRoom.get(String(room._id)) || 0;
    const recordedOccupancy = room.currentOccupancy || 0;

    // Occupancy mismatch
    if (recordedOccupancy !== actualCount) {
      problems.push({
        code: "room_occupancy_mismatch",
        severity: "critical",
        message: `Room "${room.roomNumber}" recorded occupancy is ${recordedOccupancy}, but active Allocations count is ${actualCount}.`,
        entityId: String(room._id),
      });
    }

    // Over-capacity check
    if (actualCount > room.capacity) {
      problems.push({
        code: "room_over_capacity",
        severity: "critical",
        message: `Room "${room.roomNumber}" has ${actualCount} active occupants, exceeding capacity ${room.capacity}.`,
        entityId: String(room._id),
      });
    }
  }

  // 2. Student with duplicate active allocations
  const studentActiveCounts = new Map();
  for (const a of activeAllocations) {
    const sId = String(a.student);
    studentActiveCounts.set(sId, (studentActiveCounts.get(sId) || 0) + 1);
  }

  for (const [sId, count] of studentActiveCounts.entries()) {
    if (count > 1) {
      problems.push({
        code: "student_duplicate_active_allocation",
        severity: "critical",
        message: `Student "${sId}" has ${count} active room allocations.`,
        entityId: sId,
      });
    }
  }

  // 3. Active allocation whose group is not "locked"
  const groupIdsInAllocations = new Set(activeAllocations.map((a) => String(a.group)));
  const groupsInAllocations = await RoommateGroup.find({
    _id: { $in: Array.from(groupIdsInAllocations) },
  }).lean();

  const groupStatusMap = new Map();
  groupsInAllocations.forEach((g) => groupStatusMap.set(String(g._id), g.status));

  for (const a of activeAllocations) {
    const gId = String(a.group);
    const status = groupStatusMap.get(gId);
    if (status && status !== "locked") {
      problems.push({
        code: "allocation_group_not_locked",
        severity: "warning",
        message: `Active Allocation "${a._id}" references group "${gId}" with status "${status}" (expected "locked").`,
        entityId: String(a._id),
      });
    }
  }

  // 4. Locked group without active allocations
  const lockedGroupIds = new Set(lockedGroups.map((g) => String(g._id)));
  for (const gId of lockedGroupIds) {
    if (!groupIdsInAllocations.has(gId)) {
      problems.push({
        code: "locked_group_without_allocations",
        severity: "warning",
        message: `Roommate group "${gId}" is locked but has zero active room allocations.`,
        entityId: gId,
      });
    }
  }

  // 5. Published run with missing snapshot
  for (const run of publishedRuns) {
    if (!run.publishSnapshot || typeof run.publishSnapshot !== "object") {
      problems.push({
        code: "published_run_missing_snapshot",
        severity: "critical",
        message: `Published allocation run "${run.name}" (${run._id}) is missing its rollback publishSnapshot.`,
        entityId: String(run._id),
      });
    }
  }

  return {
    isClean: problems.length === 0,
    problems,
    stats: {
      roomsChecked: rooms.length,
      allocationsChecked: activeAllocations.length,
      groupsChecked: lockedGroups.length,
      publishedRunsChecked: publishedRuns.length,
    },
  };
}

/**
 * Repairs room occupancy discrepancies based on active Allocation records.
 * NEVER alters rooms with status === "maintenance".
 * 
 * @returns {Promise<{ repairedCount: number, roomsExamined: number }>}
 */
export async function fixOccupancy() {
  await connectDB();

  const [rooms, activeAllocations] = await Promise.all([
    Room.find().lean(),
    Allocation.find({ status: "active" }).lean(),
  ]);

  const activeCountByRoom = new Map();
  for (const a of activeAllocations) {
    const rId = String(a.room);
    activeCountByRoom.set(rId, (activeCountByRoom.get(rId) || 0) + 1);
  }

  let repairedCount = 0;

  for (const room of rooms) {
    // Never modify maintenance rooms
    if (room.status === "maintenance") continue;

    const actualCount = activeCountByRoom.get(String(room._id)) || 0;
    const recordedOccupancy = room.currentOccupancy || 0;
    const newStatus = actualCount >= room.capacity ? "full" : "available";

    if (recordedOccupancy !== actualCount || (room.status !== "full" && actualCount >= room.capacity)) {
      await Room.findByIdAndUpdate(room._id, {
        $set: {
          currentOccupancy: actualCount,
          status: newStatus,
        },
      });
      repairedCount++;
    }
  }

  return {
    repairedCount,
    roomsExamined: rooms.length,
  };
}
