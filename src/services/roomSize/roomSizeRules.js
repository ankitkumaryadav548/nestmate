/**
 * Pure room-size rules — no Mongoose, no "@/" imports.
 * Single source of truth for room-size matching and constraint checks.
 */

/**
 * Returns true only when both students have the same roomSize and it is 2, 3, or 4.
 * Size-1 students need no roommates and can never match with anyone.
 * @param {{ roomSize?: number }|null} a
 * @param {{ roomSize?: number }|null} b
 * @returns {boolean}
 */
export function canMatchOnRoomSize(a, b) {
  if (!a || !b) return false;
  const sizeA = a.roomSize;
  const sizeB = b.roomSize;
  if (typeof sizeA !== "number" || typeof sizeB !== "number") return false;
  if (sizeA !== sizeB) return false;
  return [2, 3, 4].includes(sizeA);
}

/**
 * Returns true when a student with this roomSize needs roommates (2, 3, or 4).
 * @param {number} roomSize
 * @returns {boolean}
 */
export function needsRoommates(roomSize) {
  return [2, 3, 4].includes(roomSize);
}

/**
 * Validates whether changing a student's room size is currently allowed.
 * Blocks changing the size while the student is in an active group (forming, complete, locked)
 * or has an active allocation, with clear messages.
 *
 * @param {{ currentRoomSize: number|null, newRoomSize: number, inActiveGroup: boolean, hasAllocation: boolean }} params
 * @returns {{ allowed: boolean, reason: string|null }}
 */
export function validateRoomSizeChange({ currentRoomSize, newRoomSize, inActiveGroup, hasAllocation }) {
  if (inActiveGroup) {
    return {
      allowed: false,
      reason: "Leave your group first before changing your room size.",
    };
  }
  if (hasAllocation) {
    return {
      allowed: false,
      reason: "You have an active room allocation and cannot change room size.",
    };
  }
  return { allowed: true, reason: null };
}

/**
 * Derives the group target size from a leader's roomSize preference.
 * Throws for size 1 (single-room students do not need or create a group).
 * @param {number} roomSize
 * @returns {number}
 */
export function deriveGroupSizeFromLeader(roomSize) {
  if (roomSize === 1) {
    throw new Error("Single-room students do not need a group.");
  }
  if (![2, 3, 4].includes(roomSize)) {
    throw new Error(`Invalid roomSize: ${roomSize}. Must be 2, 3, or 4 for group creation.`);
  }
  return roomSize;
}

