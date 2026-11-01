/**
 * Central Selection Configuration (Single Source of Truth)
 * 
 * Defines selection window statuses, rate limits, allocation sources,
 * and standard selection error codes with user-friendly messages.
 */

export const WINDOW_STATUSES = ["scheduled", "open", "closed", "finalized"];

export const SELECTION_RATE_LIMIT = 10; // attempts per minute per user
export const LIST_POLL_SECONDS = 20;
export const MIN_WINDOW_MINUTES = 5;

export const FINALIZE_CONFIRM_TEXT = "FINALIZE";

export const ROOM_SOURCES = {
  ALLOCATION_RUN: "allocation_run",
  SELECTION: "selection",
  AUTO_FILL: "auto_fill",
};

export const SELECTION_ERROR_CODES = {
  WINDOW_NOT_OPEN: {
    code: "WINDOW_NOT_OPEN",
    message: "Room selection window is not currently open.",
  },
  NOT_ELIGIBLE: {
    code: "NOT_ELIGIBLE",
    message: "You are not eligible to select a room at this time.",
  },
  ROOM_TAKEN: {
    code: "ROOM_TAKEN",
    message: "This room was just claimed by another student or group. Please choose another.",
  },
  ROOM_NOT_VALID: {
    code: "ROOM_NOT_VALID",
    message: "This room does not satisfy your group's eligibility or deal-breaker constraints.",
  },
  ALREADY_HAS_ROOM: {
    code: "ALREADY_HAS_ROOM",
    message: "You or your group already have an allocated room.",
  },
  NOT_LEADER: {
    code: "NOT_LEADER",
    message: "Only the group leader can select or release a room for the group.",
  },
  GROUP_REQUIRED: {
    code: "GROUP_REQUIRED",
    message: "You selected shared accommodation. Please form a roommate group first, or switch to auto-placement.",
  },
  PREFERENCES_INCOMPLETE: {
    code: "PREFERENCES_INCOMPLETE",
    message: "Please complete your lifestyle questionnaire before selecting a room.",
  },
  WINDOW_CLOSED_RELEASE_BLOCKED: {
    code: "WINDOW_CLOSED_RELEASE_BLOCKED",
    message: "Rooms cannot be released after the selection window has closed. Please contact the administrator.",
  },
};

