/**
 * Roommate Groups and Invitations Configuration
 * 
 * FAIRNESS & INTEGRITY RULES:
 * 1. Demographic fields (nationality, home country, state, ethnicity) must NEVER be used in any group logic.
 * 2. Strict gender isolation: Every member of a group must have the identical gender.
 * 3. Academic year is not a hard restriction; it only affects compatibility via the year bonus.
 * 4. Group members and invitees can only see safe public fields (name, course, department, year, shared languages, scores).
 */

// Available room sizes supported by the college campus.
// Size 1 means a single room; no group is created by the student for size 1
// (the selection feature in a later prompt will create a one-person group automatically when needed).
export const GROUP_SIZE_OPTIONS = [1, 2, 3, 4];

// Invitation validity window before automatic lazy expiration
export const INVITE_EXPIRY_DAYS = 7;

// Rate-limiting / anti-spam limit on outgoing invitations per student in 24 hours
export const MAX_INVITES_PER_STUDENT_PER_DAY = 10;

// Maximum pending invitations allowed = (remaining free seats + buffer)
export const PENDING_INVITE_BUFFER = 2;

// Minimum pairwise score between candidate and EVERY existing member
// 0 means only deal-breakers block joining; campus admins can configure this higher if desired
export const MIN_PAIR_SCORE = 0;

// Lifecycle states of a roommate group
export const GROUP_STATUSES = [
  "forming",   // Open, accepting members and sending invitations
  "complete",  // All target seats filled, awaiting room allocation
  "locked",    // A room has been allocated by the warden (Phase 5)
  "disbanded", // Group was dissolved by leader or abandoned
];

// States of individual invitations
export const INVITATION_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
  "expired",
];

// =============================================================================
// JOIN REQUESTS CONFIGURATION
// =============================================================================
export const JOIN_REQUEST_EXPIRY_DAYS = 7;

export const JOIN_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "expired",
];

export const MAX_PENDING_JOIN_REQUESTS_PER_STUDENT = 5;
export const MAX_JOIN_REQUESTS_PER_STUDENT_PER_DAY = 10;
export const MAX_PENDING_JOIN_REQUESTS_PER_GROUP = 10;
export const REJECTION_COOLDOWN_HOURS = 24;
export const JOIN_REQUEST_MESSAGE_MAX = 200;

export const JOIN_ERROR_CODES = {
  GROUP_NOT_OPEN: {
    code: "GROUP_NOT_OPEN",
    message: "This group is not accepting join requests.",
  },
  NO_FREE_SEAT: {
    code: "NO_FREE_SEAT",
    message: "This group has no available seats.",
  },
  NOT_COMPATIBLE: {
    code: "NOT_COMPATIBLE",
    message: "This group is not available for you",
  },
  ALREADY_IN_GROUP: {
    code: "ALREADY_IN_GROUP",
    message: "You already belong to a full or active roommate group.",
  },
  LEAVE_GROUP_FIRST: {
    code: "LEAVE_GROUP_FIRST",
    message: "Leave your current group first.",
  },
  RELEASE_ROOM_FIRST: {
    code: "RELEASE_ROOM_FIRST",
    message: "Release your group's selected room first.",
  },
  ALREADY_HAS_ROOM: {
    code: "ALREADY_HAS_ROOM",
    message: "You already have an allocated room.",
  },
  PENDING_EXISTS: {
    code: "PENDING_EXISTS",
    message: "You already have a pending join request for this group.",
  },
  INVITATION_EXISTS: {
    code: "INVITATION_EXISTS",
    message: "You have a pending invitation from this group.",
  },
  COOLDOWN_ACTIVE: {
    code: "COOLDOWN_ACTIVE",
    message: "A recent join request was declined. Please wait 24 hours before requesting again.",
  },
  TOO_MANY_PENDING: {
    code: "TOO_MANY_PENDING",
    message: "You have reached the maximum number of pending join requests (5).",
  },
  DAILY_LIMIT: {
    code: "DAILY_LIMIT",
    message: "You have reached the daily limit for join requests (10).",
  },
  GROUP_PENDING_LIMIT: {
    code: "GROUP_PENDING_LIMIT",
    message: "This group has reached its maximum pending join requests.",
  },
  REQUEST_NOT_PENDING: {
    code: "REQUEST_NOT_PENDING",
    message: "This join request is no longer pending.",
  },
  NOT_LEADER: {
    code: "NOT_LEADER",
    message: "Only the group leader can review join requests.",
  },
  PREFERENCES_INCOMPLETE: {
    code: "PREFERENCES_INCOMPLETE",
    message: "Please complete your roommate preferences before requesting to join a group.",
  },
};
