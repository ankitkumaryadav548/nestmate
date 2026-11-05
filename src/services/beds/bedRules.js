/**
 * Pure Bed Assignment Rules Module
 * 
 * PURE MODULE: Zero database / Mongoose dependencies, zero Next.js "@/" path aliases.
 */

/**
 * Validates bed assignment proposals for a room.
 *
 * @param {{
 *   capacity: number,
 *   members: (string | { id?: string, _id?: string })[],
 *   assignments: { userId: string, bedNumber: number | null }[],
 *   currentMap?: Record<string, number | null>
 * }} params
 * @returns {{ ok: boolean, error: string | null, finalMap?: Record<string, number | null> }}
 */
export function validateBedAssignments({
  capacity,
  members = [],
  assignments = [],
  currentMap = {},
}) {
  if (!Number.isInteger(capacity) || capacity < 1) {
    return { ok: false, error: "Room capacity must be a positive integer" };
  }

  if (!Array.isArray(members) || members.length === 0) {
    return { ok: false, error: "Room has no active members" };
  }

  // Normalize member IDs to string set
  const memberSet = new Set(
    members.map((m) => {
      if (typeof m === "string") return m;
      if (m && m.id) return String(m.id);
      if (m && m._id) return String(m._id);
      return String(m);
    })
  );

  if (!Array.isArray(assignments)) {
    return { ok: false, error: "Assignments must be an array" };
  }

  // Track beds in request to detect duplicate beds in the request
  const requestBedsSeen = new Map();

  // Validate each assignment item
  for (const item of assignments) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "Invalid assignment item format" };
    }

    const userId = String(item.userId || "");
    if (!memberSet.has(userId)) {
      return { ok: false, error: `Unknown user ${userId} in bed assignments` };
    }

    const bed = item.bedNumber;
    if (bed !== null && bed !== undefined) {
      if (!Number.isInteger(bed)) {
        return { ok: false, error: `Bed number must be an integer, received: ${bed}` };
      }

      if (bed < 1 || bed > capacity) {
        return { ok: false, error: `Bed number must be between 1 and ${capacity}` };
      }

      if (requestBedsSeen.has(bed)) {
        return { ok: false, error: `Duplicate bed number ${bed} in request` };
      }
      requestBedsSeen.set(bed, userId);
    }
  }

  // Build the proposed finalMap starting from currentMap (or null for all members)
  const finalMap = {};
  for (const mId of memberSet) {
    finalMap[mId] = currentMap[mId] !== undefined ? currentMap[mId] : null;
  }

  // Apply new assignments
  for (const item of assignments) {
    const userId = String(item.userId);
    finalMap[userId] = item.bedNumber !== undefined ? item.bedNumber : null;
  }

  // Verify that in finalMap, no bed is assigned to multiple members
  const finalBedsSeen = new Map();
  for (const [userId, bed] of Object.entries(finalMap)) {
    if (bed !== null && bed !== undefined) {
      if (finalBedsSeen.has(bed)) {
        return {
          ok: false,
          error: `Bed number ${bed} is already used by another roommate`,
        };
      }
      finalBedsSeen.set(bed, userId);
    }
  }

  return {
    ok: true,
    error: null,
    finalMap,
  };
}

/**
 * Deterministically auto-assigns the lowest free bed to each unassigned member.
 *
 * @param {number} capacity
 * @param {Record<string, number | null>} currentMap
 * @param {(string | { id?: string, _id?: string })[]} memberIds
 * @returns {Record<string, number | null>}
 */
export function autoAssignRemaining(capacity, currentMap = {}, memberIds = []) {
  const normMembers = memberIds.map((m) => (typeof m === "string" ? m : String(m.id || m._id || m)));
  const finalMap = {};

  // Copy current map for valid members
  for (const mId of normMembers) {
    const b = currentMap[mId];
    if (Number.isInteger(b) && b >= 1 && b <= capacity) {
      finalMap[mId] = b;
    } else {
      finalMap[mId] = null;
    }
  }

  // Find which beds 1..capacity are already occupied
  const occupiedBeds = new Set(Object.values(finalMap).filter((b) => b !== null));

  // Find free beds in ascending order 1..capacity
  const freeBeds = [];
  for (let b = 1; b <= capacity; b++) {
    if (!occupiedBeds.has(b)) {
      freeBeds.push(b);
    }
  }

  // Find unassigned members
  const unassigned = normMembers.filter((mId) => finalMap[mId] === null);

  for (let i = 0; i < unassigned.length && i < freeBeds.length; i++) {
    finalMap[unassigned[i]] = freeBeds[i];
  }

  return finalMap;
}

