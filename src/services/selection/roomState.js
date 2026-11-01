/**
 * Pure Room State & Claim Validation Module
 * 
 * PURE MODULE: Zero database / Mongoose dependencies, zero Next.js "@/" path aliases.
 */

import { isHostelEligibleForGroup } from "../roomPreferences/preferenceLogic.js";

/**
 * Derives the room status from capacity, occupancy, claim, and maintenance state.
 * 
 * Rules:
 * 1. inMaintenance === true -> "maintenance"
 * 2. occupancy >= capacity -> "full"
 * 3. hasClaim === true -> "claimed"
 * 4. otherwise -> "available"
 * 
 * @param {{
 *   capacity: number,
 *   occupancy: number,
 *   hasClaim?: boolean,
 *   inMaintenance?: boolean
 * }} params
 * @returns {"maintenance" | "full" | "claimed" | "available"}
 */
export function nextRoomState({ capacity = 0, occupancy = 0, hasClaim = false, inMaintenance = false }) {
  if (inMaintenance) {
    return "maintenance";
  }
  if (occupancy >= capacity && capacity > 0) {
    return "full";
  }
  if (hasClaim) {
    return "claimed";
  }
  return "available";
}

/**
 * Checks whether a room type satisfies a student's hard AC deal-breaker constraint.
 * 
 * @param {object} student - Student object with { preferences: { dealBreakers, acPreference } }
 * @param {string} roomType - "AC" | "Non-AC"
 * @returns {boolean}
 */
export function satisfiesAcDealBreaker(student, roomType) {
  if (!student) return true;
  const prefs = student.preferences || {};
  const dealBreakers = Array.isArray(prefs.dealBreakers) ? prefs.dealBreakers : [];

  if (!dealBreakers.includes("acType")) {
    return true;
  }

  const acPref = (prefs.acPreference || "").toLowerCase();
  const normalizedRoomType = (roomType || "").toLowerCase();

  if (acPref === "ac" && normalizedRoomType !== "ac") {
    return false;
  }
  if (acPref === "non-ac" && normalizedRoomType !== "non-ac") {
    return false;
  }

  return true;
}

/**
 * Evaluates whether a unit (group or 1-person unit) can claim a specific room.
 * 
 * Validates:
 * 1. Room is not in maintenance
 * 2. Room is currently available (status "available", occupancy 0, no active claim)
 * 3. Room capacity strictly equals unit size
 * 4. Hostel is active
 * 5. Hostel passes gender & year eligibility for ALL current members
 * 6. Room type satisfies strict AC deal-breakers for ALL current members
 * 
 * @param {object} room - Room object
 * @param {object} hostel - Hostel object
 * @param {{ size: number, members: Array<object> }} unit - Unit object
 * @returns {{ ok: boolean, code?: string, reason?: string }}
 */
export function canClaimRoom(room, hostel, unit) {
  if (!room || !hostel || !unit) {
    return { ok: false, code: "ROOM_NOT_VALID", reason: "Invalid parameters" };
  }

  // 1. Maintenance check
  if (room.status === "maintenance") {
    return { ok: false, code: "ROOM_NOT_VALID", reason: "Room is under maintenance" };
  }

  // 2. Availability & Claim check
  const hasClaim = Boolean(room.claim?.group || room.claim?.student);
  if (room.status !== "available" || hasClaim || (room.currentOccupancy || 0) > 0) {
    return { ok: false, code: "ROOM_TAKEN", reason: "Room is already claimed or occupied" };
  }

  // 3. Exact capacity match
  if (room.capacity !== unit.size) {
    return {
      ok: false,
      code: "ROOM_NOT_VALID",
      reason: `Room capacity (${room.capacity}) does not match your unit size (${unit.size})`,
    };
  }

  // 4. Hostel active check
  if (hostel.isActive === false) {
    return { ok: false, code: "ROOM_NOT_VALID", reason: "Hostel is currently inactive" };
  }

  // 5. Hostel gender and year eligibility for all members
  const members = Array.isArray(unit.members) ? unit.members : [];
  const eligibility = isHostelEligibleForGroup(hostel, members);
  if (!eligibility.eligible) {
    return {
      ok: false,
      code: "ROOM_NOT_VALID",
      reason: `Hostel is not eligible for all members (reason: ${eligibility.reason})`,
    };
  }

  // 6. Hard AC deal-breaker rule for all members
  for (const member of members) {
    if (!satisfiesAcDealBreaker(member, room.roomType)) {
      return {
        ok: false,
        code: "ROOM_NOT_VALID",
        reason: "Room AC type conflicts with a member's strict deal-breaker",
      };
    }
  }

  return { ok: true };
}

/**
 * Checks whether a candidate student can join a group that already owns a room.
 * 
 * @param {object} candidate - Student candidate
 * @param {object} room - Room object owned by group
 * @param {object} hostel - Hostel object where room is located
 * @returns {{ ok: boolean, code?: string, reason?: string }}
 */
export function canJoinRoomedGroup(candidate, room, hostel) {
  if (!candidate || !room || !hostel) {
    return { ok: false, code: "ROOM_NOT_VALID", reason: "Invalid parameters" };
  }

  // 1. Hostel eligibility for candidate
  const eligibility = isHostelEligibleForGroup(hostel, [candidate]);
  if (!eligibility.eligible) {
    return {
      ok: false,
      code: "ROOM_NOT_VALID",
      reason: `Hostel not eligible for candidate (reason: ${eligibility.reason})`,
    };
  }

  // 2. Hard AC deal-breaker rule for candidate
  if (!satisfiesAcDealBreaker(candidate, room.roomType)) {
    return {
      ok: false,
      code: "ROOM_NOT_VALID",
      reason: "Room AC type conflicts with candidate's strict deal-breaker",
    };
  }

  return { ok: true };
}

