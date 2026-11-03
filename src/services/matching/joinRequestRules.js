/**
 * Pure Join Request Rules & Fit Evaluation Engine
 * 
 * PURE MODULE: Zero database / Mongoose dependencies, zero Next.js "@/" path aliases.
 * Deterministic, unit-testable, and explainable in technical architecture vivas.
 */

import { canJoinGroup, calculateGroupScore } from "./groupScore.js";
import {
  JOIN_ERROR_CODES,
  MAX_PENDING_JOIN_REQUESTS_PER_STUDENT,
  MAX_JOIN_REQUESTS_PER_STUDENT_PER_DAY,
  MAX_PENDING_JOIN_REQUESTS_PER_GROUP,
  REJECTION_COOLDOWN_HOURS,
} from "../../config/groups.js";

/**
 * Safely extracts a string ID from an object or string identifier.
 */
function toIdString(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val.toHexString === "function") return val.toHexString();
  if (val._id) {
    if (typeof val._id.toHexString === "function") return val._id.toHexString();
    return String(val._id);
  }
  if (val.id) {
    if (typeof val.id === "string") return val.id;
    if (typeof val.id.toHexString === "function") return val.id.toHexString();
  }
  return String(val);
}

/**
 * Evaluates whether a candidate student fits with all members of a group.
 * Wraps the existing pure canJoinGroup module.
 * 
 * @param {object} candidate - Student object with { preferences, gender, year, ... }
 * @param {Array<object>} members - Array of member student objects
 * @param {object} [weights] - Custom category weights
 * @param {Function} [scoreFn=canJoinGroup] - Injectable group fit evaluator
 * @returns {{
 *   allowed: boolean,
 *   perMemberScores: Array<{ memberId: string, score: number, label: string }>,
 *   average: number,
 *   lowest: number
 * }}
 */
export function evaluateJoinFit(candidate, members = [], weights, scoreFn = canJoinGroup) {
  const res = scoreFn(candidate, members, weights);

  const mappedScores = (res.perMemberScores || []).map((s, idx) => {
    const member = members[s.memberIndex !== undefined ? s.memberIndex : idx];
    const memberId = toIdString(member) || `m_${idx}`;
    return {
      memberId,
      score: s.score,
      label: s.label,
    };
  });

  return {
    allowed: Boolean(res.allowed),
    perMemberScores: mappedScores,
    average: res.average,
    lowest: res.lowest,
  };
}

/**
 * Computes the aggregate score before and after a candidate joins.
 * For groups with 1 member, before.average is null.
 * 
 * @param {Array<object>} members - Existing group members
 * @param {object} candidate - Prospective joiner
 * @param {object} [weights] - Category weights
 * @param {Function} [scoreFn=calculateGroupScore] - Pure scoring engine
 * @returns {{
 *   before: { average: number|null, lowest: number|null },
 *   after: { average: number, lowest: number },
 *   delta: { average: number|null, lowest: number|null }
 * }}
 */
export function previewJoinImpact(members = [], candidate, weights, scoreFn = calculateGroupScore) {
  let before = { average: null, lowest: null };
  if (Array.isArray(members) && members.length > 1) {
    const beforeScore = scoreFn(members, weights);
    before = { average: beforeScore.average, lowest: beforeScore.lowest };
  }

  const combinedMembers = Array.isArray(members) ? [...members, candidate] : [candidate];
  const afterScore = scoreFn(combinedMembers, weights);
  const after = { average: afterScore.average, lowest: afterScore.lowest };

  const delta = {
    average: before.average !== null ? after.average - before.average : null,
    lowest: before.lowest !== null ? after.lowest - before.lowest : null,
  };

  return { before, after, delta };
}

/**
 * Evaluates whether a student can send a join request to a specific group.
 * Strictly checks conditions in prompt order.
 * 
 * @param {{
 *   student: object,
 *   group: object,
 *   groupMembers?: Array<object>,
 *   studentGroup?: object|null,
 *   studentGroupMembers?: Array<object>,
 *   hasActiveAllocation?: boolean,
 *   hasPendingInvitationFromGroup?: boolean,
 *   pendingRequestsCount?: number,
 *   requestsToday?: number,
 *   groupPendingCount?: number,
 *   existingPendingForGroup?: boolean,
 *   lastRejectedAt?: Date|string|null,
 *   now?: Date,
 *   roomedGroupCheck?: boolean,
 *   weights?: object,
 *   scoreFn?: Function
 * }} params
 * @returns {{ allowed: boolean, code?: string, reason?: string }}
 */
export function canRequestToJoin({
  student,
  group,
  groupMembers = [],
  studentGroup = null,
  studentGroupMembers = [],
  hasActiveAllocation = false,
  hasPendingInvitationFromGroup = false,
  pendingRequestsCount = 0,
  requestsToday = 0,
  groupPendingCount = 0,
  existingPendingForGroup = false,
  lastRejectedAt = null,
  now = new Date(),
  roomedGroupCheck = true,
  weights,
  scoreFn = canJoinGroup,
}) {
  // 1. Preferences incomplete
  if (!student?.preferences || !student.preferences.completedAt || !student.preferences.roomSize) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.PREFERENCES_INCOMPLETE.code,
      reason: JOIN_ERROR_CODES.PREFERENCES_INCOMPLETE.message,
    };
  }

  // 2. Active allocation check
  if (hasActiveAllocation) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.ALREADY_HAS_ROOM.code,
      reason: JOIN_ERROR_CODES.ALREADY_HAS_ROOM.message,
    };
  }

  // 3. Same gender and same room size as group.targetSize (Hard filters)
  const studentGender = (student.gender || "").toLowerCase();
  const groupGender = (group?.gender || "").toLowerCase();
  const studentRoomSize = Number(student.roomSize || student.preferences?.roomSize);
  const groupTargetSize = Number(group?.targetSize);

  if (studentGender !== groupGender || studentRoomSize !== groupTargetSize) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.NOT_COMPATIBLE.code,
      reason: JOIN_ERROR_CODES.NOT_COMPATIBLE.message,
    };
  }

  // 4. Group status forming and not full
  if (group?.status !== "forming") {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.GROUP_NOT_OPEN.code,
      reason: JOIN_ERROR_CODES.GROUP_NOT_OPEN.message,
    };
  }

  if (groupMembers.length >= groupTargetSize) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.NO_FREE_SEAT.code,
      reason: JOIN_ERROR_CODES.NO_FREE_SEAT.message,
    };
  }

  // 5. Requester already in another group:
  // Allowed ONLY when that group has exactly one member (the requester as leader) and no selectedRoom;
  // Otherwise LEAVE_GROUP_FIRST, or RELEASE_ROOM_FIRST when it has a room.
  if (studentGroup && ["forming", "complete", "locked"].includes(studentGroup.status)) {
    const isSameGroup = toIdString(studentGroup) === toIdString(group);
    if (isSameGroup) {
      return {
        allowed: false,
        code: JOIN_ERROR_CODES.ALREADY_IN_GROUP.code,
        reason: JOIN_ERROR_CODES.ALREADY_IN_GROUP.message,
      };
    }

    if (studentGroup.selectedRoom) {
      return {
        allowed: false,
        code: JOIN_ERROR_CODES.RELEASE_ROOM_FIRST.code,
        reason: JOIN_ERROR_CODES.RELEASE_ROOM_FIRST.message,
      };
    }

    const membersToCheck = studentGroupMembers.length > 0 ? studentGroupMembers : studentGroup.members || [];
    const studentId = toIdString(student);
    const leaderId = toIdString(studentGroup.leader);
    const isLeader = leaderId === studentId;
    const isSolo = membersToCheck.length <= 1;

    if (!isLeader || !isSolo) {
      return {
        allowed: false,
        code: JOIN_ERROR_CODES.LEAVE_GROUP_FIRST.code,
        reason: JOIN_ERROR_CODES.LEAVE_GROUP_FIRST.message,
      };
    }
  }

  // 6. Pending request already exists for this group
  if (existingPendingForGroup) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.PENDING_EXISTS.code,
      reason: JOIN_ERROR_CODES.PENDING_EXISTS.message,
    };
  }

  // 7. Invitation from this group is pending
  if (hasPendingInvitationFromGroup) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.INVITATION_EXISTS.code,
      reason: JOIN_ERROR_CODES.INVITATION_EXISTS.message,
    };
  }

  // 8. Cooldown after a rejection (24 hours)
  if (lastRejectedAt) {
    const rejectedTime = new Date(lastRejectedAt).getTime();
    const cooldownEnd = rejectedTime + REJECTION_COOLDOWN_HOURS * 60 * 60 * 1000;
    if (new Date(now).getTime() < cooldownEnd) {
      return {
        allowed: false,
        code: JOIN_ERROR_CODES.COOLDOWN_ACTIVE.code,
        reason: JOIN_ERROR_CODES.COOLDOWN_ACTIVE.message,
      };
    }
  }

  // 9. Per-student pending limit (5)
  if (pendingRequestsCount >= MAX_PENDING_JOIN_REQUESTS_PER_STUDENT) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.TOO_MANY_PENDING.code,
      reason: JOIN_ERROR_CODES.TOO_MANY_PENDING.message,
    };
  }

  // 10. Daily limit (10)
  if (requestsToday >= MAX_JOIN_REQUESTS_PER_STUDENT_PER_DAY) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.DAILY_LIMIT.code,
      reason: JOIN_ERROR_CODES.DAILY_LIMIT.message,
    };
  }

  // 11. Group pending-request limit (10)
  if (groupPendingCount >= MAX_PENDING_JOIN_REQUESTS_PER_GROUP) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.GROUP_PENDING_LIMIT.code,
      reason: JOIN_ERROR_CODES.GROUP_PENDING_LIMIT.message,
    };
  }

  // 12. Fit evaluation (mutual deal-breakers & compatibility)
  const fitResult = evaluateJoinFit(student, groupMembers, weights, scoreFn);
  if (!fitResult.allowed) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.NOT_COMPATIBLE.code,
      reason: JOIN_ERROR_CODES.NOT_COMPATIBLE.message,
    };
  }

  // 13. Roomed-group physical constraint check (Year, AC, Hostel eligibility)
  if (roomedGroupCheck === false) {
    return {
      allowed: false,
      code: JOIN_ERROR_CODES.NOT_COMPATIBLE.code,
      reason: JOIN_ERROR_CODES.NOT_COMPATIBLE.message,
    };
  }

  return { allowed: true };
}

/**
 * Maps system event to request close reason.
 * 
 * @param {string} event 
 * @param {object} [request] 
 * @returns {string}
 */
export function shouldAutoCloseRequests(event, request) {
  switch (event) {
    case "group_full":
      return "group_full";
    case "group_disbanded":
      return "group_disbanded";
    case "group_locked":
      return "group_locked";
    case "requester_joined_elsewhere":
      return "requester_joined_elsewhere";
    case "expired":
      return "expired";
    case "cancelled_by_admin":
      return "cancelled_by_admin";
    default:
      return event || "closed";
  }
}

/**
 * Checks if a pending join request has expired lazily.
 * 
 * @param {object} request 
 * @param {Date} [now=new Date()] 
 * @returns {boolean}
 */
export function isExpired(request, now = new Date()) {
  if (!request || request.status !== "pending") return false;
  if (!request.expiresAt) return false;
  return new Date(request.expiresAt).getTime() <= new Date(now).getTime();
}

