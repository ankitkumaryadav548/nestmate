/**
 * Pure Selection & Release Eligibility Rules Module
 * 
 * PURE MODULE: Zero database / Mongoose dependencies, zero Next.js "@/" path aliases.
 */

import { SELECTION_ERROR_CODES } from "../../config/selection.js";

/**
 * Determines whether a student is eligible to browse and select a room.
 * 
 * Rules:
 * 1. Window must be "open".
 * 2. Student cannot have an active allocation already.
 * 3. Student must have completed preferences (including roomSize).
 * 4. If roomSize === 1: mode is "single", no group needed, student selects directly.
 * 5. If roomSize in [2, 3, 4]:
 *    - Student must belong to a group (GROUP_REQUIRED if no group).
 *    - Student must be the group leader (NOT_LEADER if non-leader).
 *    - Group status must be "forming" or "complete".
 *    - Group targetSize must equal student's roomSize.
 *    - Group must not already have a selectedRoom (ALREADY_HAS_ROOM).
 * 
 * @param {{
 *   student: { id: string, roomSize: number },
 *   group?: { id: string, leader: string, targetSize: number, status: string, selectedRoom?: any, myRole?: string },
 *   hasActiveAllocation?: boolean,
 *   preferencesCompleted?: boolean,
 *   windowStatus?: string | null
 * }} params
 * @returns {{
 *   allowed: boolean,
 *   code?: string,
 *   mode: "single" | "group" | "none",
 *   message?: string
 * }}
 */
export function canStudentSelect({
  student,
  group,
  hasActiveAllocation = false,
  preferencesCompleted = false,
  windowStatus = null,
}) {
  if (windowStatus !== "open") {
    return {
      allowed: false,
      code: SELECTION_ERROR_CODES.WINDOW_NOT_OPEN.code,
      mode: "none",
      message: SELECTION_ERROR_CODES.WINDOW_NOT_OPEN.message,
    };
  }

  if (hasActiveAllocation) {
    return {
      allowed: false,
      code: SELECTION_ERROR_CODES.ALREADY_HAS_ROOM.code,
      mode: "none",
      message: SELECTION_ERROR_CODES.ALREADY_HAS_ROOM.message,
    };
  }

  if (!preferencesCompleted || !student?.roomSize) {
    return {
      allowed: false,
      code: SELECTION_ERROR_CODES.PREFERENCES_INCOMPLETE.code,
      mode: "none",
      message: SELECTION_ERROR_CODES.PREFERENCES_INCOMPLETE.message,
    };
  }

  const roomSize = Number(student.roomSize);

  // Single-room student: autonomous selection
  if (roomSize === 1) {
    return {
      allowed: true,
      mode: "single",
    };
  }

  // Shared room (2 to 4 seaters): requires group leadership
  if (roomSize >= 2 && roomSize <= 4) {
    if (!group) {
      return {
        allowed: false,
        code: SELECTION_ERROR_CODES.GROUP_REQUIRED.code,
        mode: "none",
        message: SELECTION_ERROR_CODES.GROUP_REQUIRED.message,
      };
    }

    const isLeader =
      group.myRole === "leader" ||
      String(group.leader?.id || group.leader?._id || group.leader) === String(student.id || student._id);

    if (!isLeader) {
      return {
        allowed: false,
        code: SELECTION_ERROR_CODES.NOT_LEADER.code,
        mode: "group",
        message: SELECTION_ERROR_CODES.NOT_LEADER.message,
      };
    }

    if (group.targetSize !== roomSize) {
      return {
        allowed: false,
        code: SELECTION_ERROR_CODES.NOT_ELIGIBLE.code,
        mode: "group",
        message: "Group target room size does not match your preference.",
      };
    }

    if (group.status !== "forming" && group.status !== "complete") {
      return {
        allowed: false,
        code: SELECTION_ERROR_CODES.NOT_ELIGIBLE.code,
        mode: "group",
        message: `Group is currently ${group.status}. Only forming or complete groups can select a room.`,
      };
    }

    if (group.selectedRoom) {
      return {
        allowed: false,
        code: SELECTION_ERROR_CODES.ALREADY_HAS_ROOM.code,
        mode: "group",
        message: "Your group has already selected a room.",
      };
    }

    return {
      allowed: true,
      mode: "group",
    };
  }

  return {
    allowed: false,
    code: SELECTION_ERROR_CODES.NOT_ELIGIBLE.code,
    mode: "none",
    message: "Invalid room size preference.",
  };
}

/**
 * Validates whether a room can be voluntarily released by student or leader.
 * 
 * Rules:
 * 1. Window must be currently "open". If closed or finalized, release is blocked.
 * 2. If single room: student who claimed can release.
 * 3. If group room: only leader can release.
 * 
 * @param {{
 *   windowStatus: string,
 *   isLeader?: boolean,
 *   group?: object,
 *   isSingle?: boolean
 * }} params
 * @returns {{ allowed: boolean, code?: string, reason?: string }}
 */
export function canReleaseRoom({ windowStatus, isLeader = false, group = null, isSingle = false }) {
  if (windowStatus !== "open") {
    return {
      allowed: false,
      code: SELECTION_ERROR_CODES.WINDOW_CLOSED_RELEASE_BLOCKED.code,
      reason: SELECTION_ERROR_CODES.WINDOW_CLOSED_RELEASE_BLOCKED.message,
    };
  }

  if (isSingle) {
    return { allowed: true };
  }

  if (!isLeader) {
    return {
      allowed: false,
      code: SELECTION_ERROR_CODES.NOT_LEADER.code,
      reason: SELECTION_ERROR_CODES.NOT_LEADER.message,
    };
  }

  if (!group || !group.selectedRoom) {
    return {
      allowed: false,
      code: SELECTION_ERROR_CODES.NOT_ELIGIBLE.code,
      reason: "No active room to release.",
    };
  }

  return { allowed: true };
}

