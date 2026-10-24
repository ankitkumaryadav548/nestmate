/**
 * Pure Publish Plan Generation Engine
 * 
 * Verifies live database state consistency and computes the exact set of atomic operations
 * required to publish a draft allocation run.
 * 
 * PURE MODULE: Zero database access, no Mongoose, no "@/ " imports.
 */

import { roomMeetsHardConstraints } from "./roomPlacement.js";
import { checkDealBreakers } from "../matching/scoreEngine.js";

/**
 * Builds and validates the complete publication execution plan.
 * 
 * @param {object} params
 * @param {Array<object>} params.assignments - Draft assignments (assigned & waitlisted)
 * @param {Array<object>|Map<string, object>} params.units - Unit definitions
 * @param {Array<object>|Map<string, object>} params.liveRoomsState - Current live room docs
 * @param {Array<object>|Map<string, object>} params.liveGroupsState - Current live group docs
 * @param {Array<object>|Map<string, object>} [params.liveHostelsState] - Current live hostel docs
 * @param {Array<object>|Map<string, object>} [params.liveStudentsState] - Current live student docs
 * @param {Set<string>|Array<string>} params.activeAllocatedStudentIds - Students with existing active Allocations
 * @returns {{ ok: boolean, conflicts?: Array<{ code: string, message: string, unitId?: string }>, plan?: object }}
 */
export function buildPublishPlan({
  assignments = [],
  units = [],
  liveRoomsState = [],
  liveGroupsState = [],
  liveHostelsState = [],
  liveStudentsState = [],
  activeAllocatedStudentIds = new Set(),
}) {
  const conflicts = [];

  const activeAllocatedSet = activeAllocatedStudentIds instanceof Set
    ? activeAllocatedStudentIds
    : new Set(Array.isArray(activeAllocatedStudentIds) ? activeAllocatedStudentIds.map(String) : []);

  // Map indexes
  const roomMap = new Map();
  if (Array.isArray(liveRoomsState)) {
    for (const r of liveRoomsState) roomMap.set(String(r.id || r._id), r);
  } else if (liveRoomsState instanceof Map) {
    for (const [k, v] of liveRoomsState.entries()) roomMap.set(String(k), v);
  }

  const groupMap = new Map();
  if (Array.isArray(liveGroupsState)) {
    for (const g of liveGroupsState) groupMap.set(String(g.id || g._id), g);
  } else if (liveGroupsState instanceof Map) {
    for (const [k, v] of liveGroupsState.entries()) groupMap.set(String(k), v);
  }

  const hostelMap = new Map();
  if (Array.isArray(liveHostelsState)) {
    for (const h of liveHostelsState) hostelMap.set(String(h.id || h._id), h);
  } else if (liveHostelsState instanceof Map) {
    for (const [k, v] of liveHostelsState.entries()) hostelMap.set(String(k), v);
  }

  const studentMap = new Map();
  if (Array.isArray(liveStudentsState)) {
    for (const s of liveStudentsState) studentMap.set(String(s.id || s._id), s);
  } else if (liveStudentsState instanceof Map) {
    for (const [k, v] of liveStudentsState.entries()) studentMap.set(String(k), v);
  }

  const unitMap = new Map();
  if (Array.isArray(units)) {
    for (const u of units) unitMap.set(String(u.unitId || u.id || u._id), u);
  } else if (units instanceof Map) {
    for (const [k, v] of units.entries()) unitMap.set(String(k), v);
  }

  // Filter to assigned rows
  const assignedList = assignments.filter((a) => a.status === "assigned" && (a.roomId || a.room));

  const roomIncrements = [];
  const groupActions = [];
  const allocationRecords = [];
  const intentUserIds = [];
  const touchedRoomIds = [];
  const groupIdsToCancelInvitations = new Set();
  const studentIdsToCancelInvitations = new Set();

  const assignedStudentTracker = new Set();
  const assignedRoomTracker = new Set();

  for (const assign of assignedList) {
    const unitId = String(assign.unitId || assign._id || assign.id);
    const unit = unitMap.get(unitId) || assign.unit;

    if (!unit) {
      conflicts.push({
        code: "unit_missing",
        message: `Unit definition "${unitId}" could not be found.`,
        unitId,
      });
      continue;
    }

    const roomId = String(assign.roomId || assign.room?._id || assign.room?.id || assign.room);
    const liveRoom = roomMap.get(roomId);

    // 1. Room existence & state checks
    if (!liveRoom) {
      conflicts.push({
        code: "room_missing",
        message: `Assigned room "${roomId}" does not exist in live data.`,
        unitId,
      });
      continue;
    }

    if (liveRoom.status === "maintenance") {
      conflicts.push({
        code: "room_in_maintenance",
        message: `Room "${liveRoom.roomNumber}" is currently under maintenance.`,
        unitId,
      });
    }

    if ((liveRoom.currentOccupancy || 0) > 0) {
      conflicts.push({
        code: "room_not_empty",
        message: `Room "${liveRoom.roomNumber}" already has ${liveRoom.currentOccupancy} occupants.`,
        unitId,
      });
    }

    if (assignedRoomTracker.has(roomId)) {
      conflicts.push({
        code: "room_double_assigned",
        message: `Room "${liveRoom.roomNumber}" is assigned more than once in this draft.`,
        unitId,
      });
    }
    assignedRoomTracker.add(roomId);

    if (liveRoom.capacity !== unit.size) {
      conflicts.push({
        code: "capacity_mismatch",
        message: `Room "${liveRoom.roomNumber}" capacity (${liveRoom.capacity}) does not match unit size (${unit.size}).`,
        unitId,
      });
    }

    // 2. Hostel active check
    const hostelId = String(assign.hostelId || assign.hostel?._id || assign.hostel || liveRoom.hostelId || liveRoom.hostel?._id || liveRoom.hostel);
    const liveHostel = hostelMap.get(hostelId);
    if (liveHostel && liveHostel.isActive === false) {
      conflicts.push({
        code: "hostel_inactive",
        message: `Hostel "${liveHostel.name}" is marked inactive.`,
        unitId,
      });
    }

    // 3. Hard constraints (gender, allowed years, hard AC deal-breaker)
    if (liveHostel && !roomMeetsHardConstraints(liveRoom, liveHostel, unit.members)) {
      conflicts.push({
        code: "hard_constraint_violated",
        message: `Room "${liveRoom.roomNumber}" in hostel "${liveHostel.name}" violates hard constraints for unit members.`,
        unitId,
      });
    }

    // 4. Intra-unit deal-breakers check (if not overridden)
    if (!assign.overridden) {
      for (let i = 0; i < unit.members.length; i++) {
        for (let j = i + 1; j < unit.members.length; j++) {
          const check = checkDealBreakers(unit.members[i], unit.members[j]);
          if (check.excluded) {
            conflicts.push({
              code: "deal_breaker_conflict_without_override",
              message: `Unit "${unitId}" has mutual lifestyle deal-breaker conflict between ${unit.members[i].name || unit.members[i].id} and ${unit.members[j].name || unit.members[j].id} without an approved override.`,
              unitId,
            });
          }
        }
      }
    }

    // 5. Member validation: active, not already allocated, not in another group
    for (const member of unit.members) {
      const studentId = String(member._id || member.id);

      // Student active check
      const liveStudent = studentMap.get(studentId);
      if (liveStudent && liveStudent.isActive === false) {
        conflicts.push({
          code: "student_inactive",
          message: `Student "${liveStudent.name || studentId}" is inactive.`,
          unitId,
        });
      }

      // Check if student already has an active allocation in DB
      if (activeAllocatedSet.has(studentId)) {
        conflicts.push({
          code: "student_already_allocated",
          message: `Student "${member.name || studentId}" already has an active room allocation.`,
          unitId,
        });
      }

      // Check if student appears multiple times in draft
      if (assignedStudentTracker.has(studentId)) {
        conflicts.push({
          code: "student_double_assigned_in_draft",
          message: `Student "${member.name || studentId}" is assigned multiple times in this draft.`,
          unitId,
        });
      }
      assignedStudentTracker.add(studentId);

      intentUserIds.push(studentId);
      studentIdsToCancelInvitations.add(studentId);
    }

    // 6. Group action resolution & live group verification
    const kind = unit.kind || assign.unitKind;
    const sourceGroupId = unit.sourceGroupId || assign.sourceGroup;

    if (sourceGroupId) {
      const liveGroup = groupMap.get(String(sourceGroupId));
      if (!liveGroup) {
        conflicts.push({
          code: "group_changed",
          message: `Live group "${sourceGroupId}" could not be found.`,
          unitId,
        });
      } else {
        // Group status must be forming or complete
        if (liveGroup.status !== "forming" && liveGroup.status !== "complete") {
          conflicts.push({
            code: "group_changed",
            message: `Live group "${sourceGroupId}" is in "${liveGroup.status}" status (expected "forming" or "complete").`,
            unitId,
          });
        }

        // Add to invitation cancellation set
        groupIdsToCancelInvitations.add(String(sourceGroupId));

        // Snapshot previous group state for potential rollback
        const previousSnapshot = {
          members: (liveGroup.members || []).map((m) => ({
            user: String(m.user?._id || m.user?.id || m.user),
            joinedAt: m.joinedAt,
          })),
          targetSize: liveGroup.targetSize,
          status: liveGroup.status,
          completedAt: liveGroup.completedAt,
          lockedAt: liveGroup.lockedAt,
        };

        if (kind === "group") {
          groupActions.push({
            type: "lock_existing",
            groupId: String(sourceGroupId),
            unitId,
            previous: previousSnapshot,
          });
        } else if (kind === "filled-group") {
          groupActions.push({
            type: "fill_and_lock",
            groupId: String(sourceGroupId),
            unitId,
            newMembers: unit.members.map((m) => String(m._id || m.id)),
            targetSize: unit.size,
            previous: previousSnapshot,
          });
        } else if (kind === "shrunk-group") {
          groupActions.push({
            type: "shrink_and_lock",
            groupId: String(sourceGroupId),
            unitId,
            newMembers: unit.members.map((m) => String(m._id || m.id)),
            targetSize: unit.members.length,
            previous: previousSnapshot,
          });
        }
      }
    } else {
      // Pool formed group
      const allDemo = unit.members.every((m) => m.isDemo === true);
      const leaderId = String(unit.members[0]?._id || unit.members[0]?.id);
      groupActions.push({
        type: "create_and_lock",
        unitId,
        leader: leaderId,
        gender: unit.gender || unit.members[0]?.gender || "male",
        members: unit.members.map((m) => String(m._id || m.id)),
        targetSize: unit.size,
        isDemo: allDemo,
        createdByAllocation: true,
      });
    }

    // Room increment action
    roomIncrements.push({
      roomId,
      add: unit.size,
    });
    touchedRoomIds.push(roomId);

    // Allocation records to create for each student
    const isDemoUnit = unit.members.every((m) => m.isDemo === true);
    for (const m of unit.members) {
      allocationRecords.push({
        student: String(m._id || m.id),
        room: roomId,
        hostel: hostelId,
        unitId,
        sourceGroupId: sourceGroupId ? String(sourceGroupId) : null,
        isDemo: isDemoUnit,
      });
    }
  }

  if (conflicts.length > 0) {
    return { ok: false, conflicts };
  }

  return {
    ok: true,
    plan: {
      roomIncrements,
      groupActions,
      allocationRecords,
      intentUserIds: Array.from(new Set(intentUserIds)),
      touchedRoomIds: Array.from(new Set(touchedRoomIds)),
      invitationCancelRules: {
        groupIds: Array.from(groupIdsToCancelInvitations),
        studentIds: Array.from(studentIdsToCancelInvitations),
      },
    },
  };
}
