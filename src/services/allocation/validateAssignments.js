/**
 * Pure Allocation Invariant Validation Engine
 * 
 * Verifies system safety and integrity before any draft run is persisted.
 * Throws an explicit, descriptive error if ANY operational invariant is breached.
 */

import { isHostelEligibleForGroup } from "../roomPreferences/preferenceLogic.js";
import { checkDealBreakers } from "../matching/scoreEngine.js";

/**
 * Validates complete set of room assignments against all physical and logical constraints.
 * 
 * Invariants Enforced:
 * 1. Single Room Occupancy: No physical room may be assigned more than once.
 * 2. Single Student Placement: No student may appear in multiple assigned units.
 * 3. Exact Capacity Match: A room's capacity must equal the assigned unit's size.
 * 4. Hostel Gender & Academic Year Eligibility: The hostel must be strictly eligible for every member.
 * 5. Hard AC Constraint: If a member holds an acType deal-breaker, the room type must match.
 * 6. Internal Deal-Breaker Protection: No two members in the same unit may violate mutual deal-breakers.
 * 
 * @param {Array<object>} assignments 
 * @param {Array<object>|Map<string, object>} units 
 * @param {Array<object>|Map<string, object>} rooms 
 * @param {Array<object>|Map<string, object>} hostels 
 * @throws {Error} If any invariant is violated
 */
export function validateAssignments(assignments = [], units = [], rooms = [], hostels = []) {
  const roomMap = new Map();
  if (Array.isArray(rooms)) {
    for (const r of rooms) roomMap.set(String(r.id || r._id), r);
  } else if (rooms instanceof Map) {
    for (const [k, v] of rooms.entries()) roomMap.set(String(k), v);
  }

  const hostelMap = new Map();
  if (Array.isArray(hostels)) {
    for (const h of hostels) hostelMap.set(String(h.id || h._id), h);
  } else if (hostels instanceof Map) {
    for (const [k, v] of hostels.entries()) hostelMap.set(String(k), v);
  }

  const unitMap = new Map();
  if (Array.isArray(units)) {
    for (const u of units) unitMap.set(String(u.unitId || u.id), u);
  } else if (units instanceof Map) {
    for (const [k, v] of units.entries()) unitMap.set(String(k), v);
  }

  const seenRooms = new Set();
  const seenStudents = new Map(); // studentId -> unitId

  for (let idx = 0; idx < assignments.length; idx++) {
    const a = assignments[idx];
    const roomId = String(a.roomId || a.room?.id || a.room?._id);
    const unitId = String(a.unitId);

    // 1. Single Room Occupancy
    if (seenRooms.has(roomId)) {
      throw new Error(`Invariant Violation: Room "${roomId}" assigned multiple times in assignment index ${idx}.`);
    }
    seenRooms.add(roomId);

    const unit = unitMap.get(unitId) || a.unit;
    if (!unit) {
      throw new Error(`Invariant Violation: Unit "${unitId}" not found for assignment index ${idx}.`);
    }

    const room = roomMap.get(roomId) || a.room;
    if (!room) {
      throw new Error(`Invariant Violation: Room "${roomId}" not found for assignment index ${idx}.`);
    }

    const hostelId = String(a.hostelId || room.hostelId || room.hostel || (room.hostel && room.hostel._id));
    const hostel = hostelMap.get(hostelId) || a.hostel;
    if (!hostel) {
      throw new Error(`Invariant Violation: Hostel "${hostelId}" not found for room "${roomId}".`);
    }

    // 2. Exact Capacity Match
    if (room.capacity !== unit.size) {
      throw new Error(
        `Invariant Violation: Room "${room.roomNumber}" capacity (${room.capacity}) does not equal unit size (${unit.size}) for unit "${unitId}".`
      );
    }

    if (unit.members.length !== unit.size) {
      throw new Error(
        `Invariant Violation: Unit "${unitId}" declared size ${unit.size} but contains ${unit.members.length} members.`
      );
    }

    // 3. Single Student Placement
    for (const member of unit.members) {
      const studentId = String(member.id || member._id);
      if (seenStudents.has(studentId)) {
        throw new Error(
          `Invariant Violation: Student "${studentId}" assigned to multiple units ("${seenStudents.get(studentId)}" and "${unitId}").`
        );
      }
      seenStudents.set(studentId, unitId);
    }

    // 4. Hostel Gender & Academic Year Eligibility
    const eligibility = isHostelEligibleForGroup(hostel, unit.members);
    if (!eligibility.eligible) {
      throw new Error(
        `Invariant Violation: Hostel "${hostel.code || hostelId}" is not eligible for unit "${unitId}". Reason: ${eligibility.reason}.`
      );
    }

    // 5. Hard AC Constraint
    for (const member of unit.members) {
      const prefs = member.preferences || member;
      const dealBreakers = Array.isArray(prefs.dealBreakers) ? prefs.dealBreakers : [];
      if (dealBreakers.includes("acType")) {
        const requiredAc = prefs.acPreference;
        if (requiredAc === "ac" && room.roomType !== "AC") {
          throw new Error(
            `Invariant Violation: Student in unit "${unitId}" has strict AC deal-breaker but was placed in Non-AC room "${room.roomNumber}".`
          );
        }
        if (requiredAc === "non-ac" && room.roomType !== "Non-AC") {
          throw new Error(
            `Invariant Violation: Student in unit "${unitId}" has strict Non-AC deal-breaker but was placed in AC room "${room.roomNumber}".`
          );
        }
      }
    }

    // 6. Internal Deal-Breaker Protection
    for (let i = 0; i < unit.members.length; i++) {
      for (let j = i + 1; j < unit.members.length; j++) {
        const check = checkDealBreakers(unit.members[i], unit.members[j]);
        if (check.excluded) {
          throw new Error(
            `Invariant Violation: Unit "${unitId}" contains members with mutual deal-breaker conflict (${unit.members[i].name || unit.members[i].id} and ${unit.members[j].name || unit.members[j].id}).`
          );
        }
      }
    }
  }

  return true;
}
