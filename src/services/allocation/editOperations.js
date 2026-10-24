/**
 * Pure Manual Allocation Edit Operations
 * 
 * DESIGN PRINCIPLES:
 * 1. PURE FUNCTIONS: Zero database access, no Mongoose, no "@/ " imports.
 * 2. IMMUTABILITY: Never mutates input assignments or units. Always returns fresh objects.
 * 3. SAFETY FIRST: Hard constraints (gender, year eligibility, strict AC deal-breaker)
 *    are non-negotiable. Deal-breaker conflicts between swapped members flag `requiresOverride: true`.
 */

import { roomMeetsHardConstraints, preferenceScore } from "./roomPlacement.js";
import { floorMatchesBand } from "../roomPreferences/preferenceLogic.js";

/**
 * Helper to compute pairwise compatibility stats for a set of unit members.
 * 
 * @param {Array<object>} members 
 * @param {(a: object, b: object) => { score: number, excluded: boolean }} scoreFn 
 * @returns {{ averageScore: number, lowestScore: number, hasConflict: boolean, conflictingPairs: Array<[object, object]> }}
 */
export function computeUnitPairMetrics(members = [], scoreFn) {
  if (!Array.isArray(members) || members.length <= 1) {
    return { averageScore: 100, lowestScore: 100, hasConflict: false, conflictingPairs: [] };
  }

  let totalScore = 0;
  let pairCount = 0;
  let lowestScore = 100;
  let hasConflict = false;
  const conflictingPairs = [];

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      pairCount++;
      const res = scoreFn ? scoreFn(members[i], members[j]) : { score: 75, excluded: false };
      if (res.excluded) {
        hasConflict = true;
        lowestScore = 0;
        conflictingPairs.push([members[i], members[j]]);
      } else {
        totalScore += res.score;
        if (res.score < lowestScore) {
          lowestScore = res.score;
        }
      }
    }
  }

  const averageScore = pairCount > 0 ? Math.round(totalScore / pairCount) : 100;
  return {
    averageScore,
    lowestScore: pairCount > 0 ? lowestScore : 100,
    hasConflict,
    conflictingPairs,
  };
}

/**
 * Creates Map index for rooms, hostels, units, assignments by string ID.
 */
function buildLookupMaps(units, rooms, hostels, assignments) {
  const roomMap = new Map();
  for (const r of rooms || []) {
    roomMap.set(String(r.id || r._id), r);
  }

  const hostelMap = new Map();
  for (const h of hostels || []) {
    hostelMap.set(String(h.id || h._id), h);
  }

  const unitMap = new Map();
  for (const u of units || []) {
    unitMap.set(String(u.unitId || u.id || u._id), u);
  }

  const assignmentMap = new Map();
  for (const a of assignments || []) {
    assignmentMap.set(String(a.unitId), a);
  }

  return { roomMap, hostelMap, unitMap, assignmentMap };
}

/**
 * 1. moveUnit: Moves an assigned unit to a different, free room.
 * 
 * Rules:
 * - Target room must be free (not occupied in draft assignments and empty in liveRooms).
 * - Room capacity must exactly equal unit size.
 * - Target hostel must be active.
 * - Room must satisfy roomMeetsHardConstraints (gender, allowedYears, strict AC deal-breaker).
 * - Soft mismatches (AC or floor) produce warnings.
 */
export function moveUnit(assignments = [], units = [], rooms = [], hostels = [], unitId, targetRoomId, scoreFn) {
  const { roomMap, hostelMap, unitMap, assignmentMap } = buildLookupMaps(units, rooms, hostels, assignments);
  const targetIdStr = String(targetRoomId);
  const unitIdStr = String(unitId);

  const currentAssignment = assignmentMap.get(unitIdStr);
  if (!currentAssignment || currentAssignment.status !== "assigned") {
    return { ok: false, error: `Unit "${unitId}" is not currently assigned to a room.` };
  }

  const unit = unitMap.get(unitIdStr) || currentAssignment.unit;
  if (!unit) {
    return { ok: false, error: `Unit data for "${unitId}" not found.` };
  }

  const targetRoom = roomMap.get(targetIdStr);
  if (!targetRoom) {
    return { ok: false, error: `Target room "${targetRoomId}" does not exist.` };
  }

  // Check if target room is used by another assigned unit in this draft
  for (const a of assignments) {
    if (a.status === "assigned" && String(a.unitId) !== unitIdStr) {
      const aRoomId = String(a.roomId || a.room?.id || a.room?._id);
      if (aRoomId === targetIdStr) {
        return { ok: false, error: `Target room "${targetRoom.roomNumber}" is already assigned to unit "${a.unitId}".` };
      }
    }
  }

  // Live occupancy check: target room must be empty and not under maintenance
  if (targetRoom.currentOccupancy && targetRoom.currentOccupancy > 0) {
    return { ok: false, error: `Target room "${targetRoom.roomNumber}" already has occupants (${targetRoom.currentOccupancy}).` };
  }
  if (targetRoom.status === "maintenance") {
    return { ok: false, error: `Target room "${targetRoom.roomNumber}" is under maintenance.` };
  }

  // Exact capacity match
  if (targetRoom.capacity !== unit.size) {
    return {
      ok: false,
      error: `Room capacity (${targetRoom.capacity}) does not match unit size (${unit.size}).`,
    };
  }

  const targetHostelId = String(targetRoom.hostelId || targetRoom.hostel?._id || targetRoom.hostel);
  const targetHostel = hostelMap.get(targetHostelId);
  if (!targetHostel) {
    return { ok: false, error: `Hostel for room "${targetRoom.roomNumber}" not found.` };
  }

  if (targetHostel.isActive === false) {
    return { ok: false, error: `Hostel "${targetHostel.name}" is currently inactive.` };
  }

  // Hard constraints check
  if (!roomMeetsHardConstraints(targetRoom, targetHostel, unit.members)) {
    return {
      ok: false,
      error: `Target room "${targetRoom.roomNumber}" in hostel "${targetHostel.name}" violates hard constraints (gender, academic year, or AC deal-breaker).`,
    };
  }

  // Soft mismatch warnings
  const warnings = [];
  const prefs = unit.roomPreferences || {};
  if (prefs.acType === "ac" && targetRoom.roomType !== "AC") {
    warnings.push(`Unit prefers AC, but room "${targetRoom.roomNumber}" is Non-AC.`);
  } else if (prefs.acType === "non-ac" && targetRoom.roomType !== "Non-AC") {
    warnings.push(`Unit prefers Non-AC, but room "${targetRoom.roomNumber}" is AC.`);
  }

  if (prefs.floorPreference && prefs.floorPreference !== "any") {
    const floorMatch = floorMatchesBand(targetRoom.floor, targetHostel.totalFloors, prefs.floorPreference);
    if (!floorMatch) {
      warnings.push(`Unit prefers "${prefs.floorPreference}" floor, but room "${targetRoom.roomNumber}" is on floor ${targetRoom.floor}.`);
    }
  }

  // Recompute preference score
  const prefResult = preferenceScore(unit, targetRoom, targetHostel);

  // Immutably produce newAssignments
  const newAssignments = assignments.map((a) => {
    if (String(a.unitId) !== unitIdStr) return { ...a };
    return {
      ...a,
      room: targetRoom,
      roomId: targetIdStr,
      hostel: targetHostel,
      hostelId: targetHostelId,
      hostelRank: prefResult.hostelRank,
      acMatch: prefResult.acMatch,
      floorMatch: prefResult.floorMatch,
      preferenceScore: prefResult.score,
      edited: true,
    };
  });

  return {
    ok: true,
    newAssignments,
    affectedUnitIds: [unitIdStr],
    warnings,
    requiresOverride: false,
    deltas: {
      fromRoomId: String(currentAssignment.roomId || currentAssignment.room?.id || currentAssignment.room?._id),
      toRoomId: targetIdStr,
    },
  };
}

/**
 * 2. swapRooms: Swaps rooms between two assigned units of the same size.
 */
export function swapRooms(assignments = [], units = [], rooms = [], hostels = [], unitIdA, unitIdB, scoreFn) {
  const { roomMap, hostelMap, unitMap, assignmentMap } = buildLookupMaps(units, rooms, hostels, assignments);
  const idA = String(unitIdA);
  const idB = String(unitIdB);

  if (idA === idB) {
    return { ok: false, error: "Cannot swap room with the same unit." };
  }

  const assignA = assignmentMap.get(idA);
  const assignB = assignmentMap.get(idB);

  if (!assignA || assignA.status !== "assigned" || !assignA.roomId) {
    return { ok: false, error: `Unit "${unitIdA}" is not assigned to a room.` };
  }
  if (!assignB || assignB.status !== "assigned" || !assignB.roomId) {
    return { ok: false, error: `Unit "${unitIdB}" is not assigned to a room.` };
  }

  const unitA = unitMap.get(idA) || assignA.unit;
  const unitB = unitMap.get(idB) || assignB.unit;

  if (unitA.size !== unitB.size) {
    return {
      ok: false,
      error: `Cannot swap rooms: Unit A size (${unitA.size}) does not equal Unit B size (${unitB.size}).`,
    };
  }

  const roomA = roomMap.get(String(assignA.roomId || assignA.room?._id || assignA.room?.id));
  const roomB = roomMap.get(String(assignB.roomId || assignB.room?._id || assignB.room?.id));

  if (!roomA || !roomB) {
    return { ok: false, error: "One or both assigned rooms could not be found." };
  }

  const hostelA = hostelMap.get(String(roomA.hostelId || roomA.hostel?._id || roomA.hostel));
  const hostelB = hostelMap.get(String(roomB.hostelId || roomB.hostel?._id || roomB.hostel));

  if (!hostelA || !hostelB) {
    return { ok: false, error: "One or both hostels could not be found." };
  }

  // Unit A must satisfy hard constraints of Room B / Hostel B
  if (!roomMeetsHardConstraints(roomB, hostelB, unitA.members)) {
    return {
      ok: false,
      error: `Unit A cannot be placed in Room B ("${roomB.roomNumber}") due to hostel gender/year or strict AC constraints.`,
    };
  }

  // Unit B must satisfy hard constraints of Room A / Hostel A
  if (!roomMeetsHardConstraints(roomA, hostelA, unitB.members)) {
    return {
      ok: false,
      error: `Unit B cannot be placed in Room A ("${roomA.roomNumber}") due to hostel gender/year or strict AC constraints.`,
    };
  }

  const warnings = [];
  const prefResultA = preferenceScore(unitA, roomB, hostelB);
  const prefResultB = preferenceScore(unitB, roomA, hostelA);

  if (unitA.roomPreferences?.acType === "ac" && roomB.roomType !== "AC") {
    warnings.push(`Unit A prefers AC, but room "${roomB.roomNumber}" is Non-AC.`);
  }
  if (unitB.roomPreferences?.acType === "ac" && roomA.roomType !== "AC") {
    warnings.push(`Unit B prefers AC, but room "${roomA.roomNumber}" is Non-AC.`);
  }

  const newAssignments = assignments.map((a) => {
    if (String(a.unitId) === idA) {
      return {
        ...a,
        room: roomB,
        roomId: String(roomB.id || roomB._id),
        hostel: hostelB,
        hostelId: String(hostelB.id || hostelB._id),
        hostelRank: prefResultA.hostelRank,
        acMatch: prefResultA.acMatch,
        floorMatch: prefResultA.floorMatch,
        preferenceScore: prefResultA.score,
        edited: true,
      };
    }
    if (String(a.unitId) === idB) {
      return {
        ...a,
        room: roomA,
        roomId: String(roomA.id || roomA._id),
        hostel: hostelA,
        hostelId: String(hostelA.id || hostelA._id),
        hostelRank: prefResultB.hostelRank,
        acMatch: prefResultB.acMatch,
        floorMatch: prefResultB.floorMatch,
        preferenceScore: prefResultB.score,
        edited: true,
      };
    }
    return { ...a };
  });

  return {
    ok: true,
    newAssignments,
    affectedUnitIds: [idA, idB],
    warnings,
    requiresOverride: false,
    deltas: {
      unitA: { fromRoomId: String(roomA.id || roomA._id), toRoomId: String(roomB.id || roomB._id) },
      unitB: { fromRoomId: String(roomB.id || roomB._id), toRoomId: String(roomA.id || roomA._id) },
    },
  };
}

/**
 * 3. swapMembers: Swaps one member between two units.
 * 
 * Rules:
 * - Both members must have the same gender.
 * - Both units must have the same gender.
 * - Unit sizes do not change.
 * - Room hard constraints (year allowed, strict AC) are re-verified for both units.
 * - If swap creates a deal-breaker conflict inside either unit, requiresOverride: true is returned.
 */
export function swapMembers(
  assignments = [],
  units = [],
  rooms = [],
  hostels = [],
  unitIdA,
  memberIdA,
  unitIdB,
  memberIdB,
  scoreFn,
  options = {}
) {
  const { roomMap, hostelMap, unitMap, assignmentMap } = buildLookupMaps(units, rooms, hostels, assignments);
  const idA = String(unitIdA);
  const idB = String(unitIdB);
  const mIdA = String(memberIdA);
  const mIdB = String(memberIdB);

  if (idA === idB) {
    return { ok: false, error: "Cannot swap members within the same unit." };
  }

  const assignA = assignmentMap.get(idA);
  const assignB = assignmentMap.get(idB);
  if (!assignA || !assignB) {
    return { ok: false, error: "One or both units are not in the current assignments." };
  }

  const unitA = unitMap.get(idA) || assignA.unit;
  const unitB = unitMap.get(idB) || assignB.unit;
  if (!unitA || !unitB) {
    return { ok: false, error: "Unit definitions not found." };
  }

  const memberA = (unitA.members || []).find((m) => String(m.id || m._id) === mIdA);
  const memberB = (unitB.members || []).find((m) => String(m.id || m._id) === mIdB);

  if (!memberA) {
    return { ok: false, error: `Student "${memberIdA}" not found in unit "${unitIdA}".` };
  }
  if (!memberB) {
    return { ok: false, error: `Student "${memberIdB}" not found in unit "${unitIdB}".` };
  }

  // Gender check: same gender is a non-negotiable hard rule
  if (memberA.gender !== memberB.gender) {
    return {
      ok: false,
      error: `Cannot swap members with different genders (${memberA.gender} vs ${memberB.gender}).`,
    };
  }

  if (unitA.gender && unitB.gender && unitA.gender !== unitB.gender) {
    return {
      ok: false,
      error: `Cannot swap between units with different gender designations (${unitA.gender} vs ${unitB.gender}).`,
    };
  }

  // Create new member sets
  const newMembersA = unitA.members.map((m) => (String(m.id || m._id) === mIdA ? memberB : m));
  const newMembersB = unitB.members.map((m) => (String(m.id || m._id) === mIdB ? memberA : m));

  // Verify hard constraints against current rooms if assigned
  const roomA = assignA.roomId ? roomMap.get(String(assignA.roomId)) : null;
  const roomB = assignB.roomId ? roomMap.get(String(assignB.roomId)) : null;
  const hostelA = roomA ? hostelMap.get(String(roomA.hostelId || roomA.hostel?._id || roomA.hostel)) : null;
  const hostelB = roomB ? hostelMap.get(String(roomB.hostelId || roomB.hostel?._id || roomB.hostel)) : null;

  if (roomA && hostelA && !roomMeetsHardConstraints(roomA, hostelA, newMembersA)) {
    return {
      ok: false,
      error: `Swapping ${memberB.name || memberB.id} into Unit A violates room "${roomA.roomNumber}" hard constraints (year or AC deal-breaker).`,
    };
  }

  if (roomB && hostelB && !roomMeetsHardConstraints(roomB, hostelB, newMembersB)) {
    return {
      ok: false,
      error: `Swapping ${memberA.name || memberA.id} into Unit B violates room "${roomB.roomNumber}" hard constraints (year or AC deal-breaker).`,
    };
  }

  // Compute pairwise metrics and check deal-breakers
  const metricsA = computeUnitPairMetrics(newMembersA, scoreFn);
  const metricsB = computeUnitPairMetrics(newMembersB, scoreFn);

  const hasDealBreaker = metricsA.hasConflict || metricsB.hasConflict;
  const allConflictingPairs = [...metricsA.conflictingPairs, ...metricsB.conflictingPairs];

  if (hasDealBreaker && !options.confirmOverride) {
    return {
      ok: false,
      requiresOverride: true,
      conflictingPairs: allConflictingPairs.map(([x, y]) => ({
        member1: { id: String(x.id || x._id), name: x.name },
        member2: { id: String(y.id || y._id), name: y.name },
      })),
      error: "This swap creates a lifestyle deal-breaker conflict within one or both units. Admin override required.",
    };
  }

  // Update units
  const updatedUnitA = { ...unitA, members: newMembersA, groupAverage: metricsA.averageScore, groupLowest: metricsA.lowestScore };
  const updatedUnitB = { ...unitB, members: newMembersB, groupAverage: metricsB.averageScore, groupLowest: metricsB.lowestScore };

  // Recompute preference satisfaction if rooms are assigned
  let prefResultA = null;
  let prefResultB = null;
  if (roomA && hostelA) {
    prefResultA = preferenceScore(updatedUnitA, roomA, hostelA);
  }
  if (roomB && hostelB) {
    prefResultB = preferenceScore(updatedUnitB, roomB, hostelB);
  }

  const newAssignments = assignments.map((a) => {
    if (String(a.unitId) === idA) {
      return {
        ...a,
        unit: updatedUnitA,
        members: newMembersA.map((m) => m._id || m.id),
        groupAverage: metricsA.averageScore,
        groupLowest: metricsA.lowestScore,
        hostelRank: prefResultA ? prefResultA.hostelRank : a.hostelRank,
        acMatch: prefResultA ? prefResultA.acMatch : a.acMatch,
        floorMatch: prefResultA ? prefResultA.floorMatch : a.floorMatch,
        preferenceScore: prefResultA ? prefResultA.score : a.preferenceScore,
        edited: true,
        overridden: hasDealBreaker ? true : a.overridden,
        overrideReason: hasDealBreaker ? (options.overrideReason || "Admin manual swap override") : a.overrideReason,
      };
    }
    if (String(a.unitId) === idB) {
      return {
        ...a,
        unit: updatedUnitB,
        members: newMembersB.map((m) => m._id || m.id),
        groupAverage: metricsB.averageScore,
        groupLowest: metricsB.lowestScore,
        hostelRank: prefResultB ? prefResultB.hostelRank : a.hostelRank,
        acMatch: prefResultB ? prefResultB.acMatch : a.acMatch,
        floorMatch: prefResultB ? prefResultB.floorMatch : a.floorMatch,
        preferenceScore: prefResultB ? prefResultB.score : a.preferenceScore,
        edited: true,
        overridden: hasDealBreaker ? true : a.overridden,
        overrideReason: hasDealBreaker ? (options.overrideReason || "Admin manual swap override") : a.overrideReason,
      };
    }
    return { ...a };
  });

  return {
    ok: true,
    newAssignments,
    newUnits: [updatedUnitA, updatedUnitB],
    affectedUnitIds: [idA, idB],
    warnings: [],
    requiresOverride: hasDealBreaker,
    deltas: {
      unitA: { added: mIdB, removed: mIdA, groupAverage: metricsA.averageScore },
      unitB: { added: mIdA, removed: mIdB, groupAverage: metricsB.averageScore },
    },
  };
}

/**
 * 4. unassignUnit: Moves an assigned unit to the waitlist and frees its room.
 */
export function unassignUnit(assignments = [], units = [], rooms = [], hostels = [], unitId) {
  const idStr = String(unitId);
  const current = assignments.find((a) => String(a.unitId) === idStr);

  if (!current || current.status !== "assigned") {
    return { ok: false, error: `Unit "${unitId}" is not currently assigned to a room.` };
  }

  const freedRoomId = String(current.roomId || current.room?.id || current.room?._id);

  const newAssignments = assignments.map((a) => {
    if (String(a.unitId) !== idStr) return { ...a };
    return {
      ...a,
      status: "waitlisted",
      waitlistReason: "manually_unassigned",
      room: null,
      roomId: null,
      hostel: null,
      hostelId: null,
      hostelRank: null,
      acMatch: null,
      floorMatch: null,
      preferenceScore: 0,
      round: null,
      edited: true,
    };
  });

  return {
    ok: true,
    newAssignments,
    affectedUnitIds: [idStr],
    warnings: [],
    requiresOverride: false,
    deltas: { freedRoomId },
  };
}

/**
 * 5. assignWaitlisted: Assigns a waitlisted unit to a target room.
 * Same validity checks as moveUnit.
 */
export function assignWaitlisted(assignments = [], units = [], rooms = [], hostels = [], unitId, targetRoomId, scoreFn) {
  const { roomMap, hostelMap, unitMap, assignmentMap } = buildLookupMaps(units, rooms, hostels, assignments);
  const targetIdStr = String(targetRoomId);
  const unitIdStr = String(unitId);

  const currentAssignment = assignmentMap.get(unitIdStr);
  if (!currentAssignment || currentAssignment.status !== "waitlisted") {
    return { ok: false, error: `Unit "${unitId}" is not currently waitlisted.` };
  }

  const unit = unitMap.get(unitIdStr) || currentAssignment.unit;
  if (!unit) {
    return { ok: false, error: `Unit data for "${unitId}" not found.` };
  }

  const targetRoom = roomMap.get(targetIdStr);
  if (!targetRoom) {
    return { ok: false, error: `Target room "${targetRoomId}" does not exist.` };
  }

  // Room must not be assigned in this draft
  for (const a of assignments) {
    if (a.status === "assigned") {
      const aRoomId = String(a.roomId || a.room?.id || a.room?._id);
      if (aRoomId === targetIdStr) {
        return { ok: false, error: `Room "${targetRoom.roomNumber}" is already assigned to unit "${a.unitId}".` };
      }
    }
  }

  // Room must be empty in live state
  if (targetRoom.currentOccupancy && targetRoom.currentOccupancy > 0) {
    return { ok: false, error: `Room "${targetRoom.roomNumber}" already has occupants (${targetRoom.currentOccupancy}).` };
  }
  if (targetRoom.status === "maintenance") {
    return { ok: false, error: `Room "${targetRoom.roomNumber}" is under maintenance.` };
  }

  // Capacity check
  if (targetRoom.capacity !== unit.size) {
    return {
      ok: false,
      error: `Room capacity (${targetRoom.capacity}) does not match unit size (${unit.size}).`,
    };
  }

  const targetHostelId = String(targetRoom.hostelId || targetRoom.hostel?._id || targetRoom.hostel);
  const targetHostel = hostelMap.get(targetHostelId);
  if (!targetHostel) {
    return { ok: false, error: `Hostel for room "${targetRoom.roomNumber}" not found.` };
  }

  if (targetHostel.isActive === false) {
    return { ok: false, error: `Hostel "${targetHostel.name}" is currently inactive.` };
  }

  // Hard constraints check
  if (!roomMeetsHardConstraints(targetRoom, targetHostel, unit.members)) {
    return {
      ok: false,
      error: `Target room "${targetRoom.roomNumber}" violates hard constraints (gender, academic year, or AC deal-breaker).`,
    };
  }

  const warnings = [];
  const prefs = unit.roomPreferences || {};
  if (prefs.acType === "ac" && targetRoom.roomType !== "AC") {
    warnings.push(`Unit prefers AC, but room "${targetRoom.roomNumber}" is Non-AC.`);
  }

  const prefResult = preferenceScore(unit, targetRoom, targetHostel);

  const newAssignments = assignments.map((a) => {
    if (String(a.unitId) !== unitIdStr) return { ...a };
    return {
      ...a,
      status: "assigned",
      waitlistReason: null,
      room: targetRoom,
      roomId: targetIdStr,
      hostel: targetHostel,
      hostelId: targetHostelId,
      hostelRank: prefResult.hostelRank,
      acMatch: prefResult.acMatch,
      floorMatch: prefResult.floorMatch,
      preferenceScore: prefResult.score,
      round: 4,
      edited: true,
    };
  });

  return {
    ok: true,
    newAssignments,
    affectedUnitIds: [unitIdStr],
    warnings,
    requiresOverride: false,
    deltas: { assignedRoomId: targetIdStr },
  };
}
