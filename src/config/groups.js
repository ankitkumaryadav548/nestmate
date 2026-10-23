/**
 * Roommate Groups and Invitations Configuration
 * 
 * FAIRNESS & INTEGRITY RULES:
 * 1. Demographic fields (nationality, home country, state, ethnicity) must NEVER be used in any group logic.
 * 2. Strict gender isolation: Every member of a group must have the identical gender.
 * 3. Academic year is not a hard restriction; it only affects compatibility via the year bonus.
 * 4. Group members and invitees can only see safe public fields (name, course, department, year, shared languages, scores).
 */

// Available room sizes supported by the college campus (single-bed rooms need no group)
export const GROUP_SIZE_OPTIONS = [2, 3, 4];

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
