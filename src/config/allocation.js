/**
 * Hostel Allocation Engine Configuration (Phase 5 - Simulation & Draft Mode)
 * 
 * Defines core parameters, priority modes, waitlist reasons, preference point weights,
 * and default options for the deterministic hostel room allocation engine.
 */

import { GROUP_SIZE_OPTIONS } from "./groups.js";

export const ENGINE_VERSION = "1.0";

/**
 * Priority ordering modes for placing roommate groups into rooms.
 */
export const PRIORITY_MODES = ["lottery", "completedAt", "seniority"];

export const PRIORITY_MODE_DETAILS = {
  lottery: {
    id: "lottery",
    label: "Fair Seeded Lottery (Default)",
    description: "Units are placed in a pseudo-random order determined by the seed. Unbiased and fair for all students.",
  },
  completedAt: {
    id: "completedAt",
    label: "Completion Timestamp",
    description: "Groups that completed or submitted preferences earliest receive priority for room selection.",
  },
  seniority: {
    id: "seniority",
    label: "Seniority / Academic Year",
    description: "Units with higher average academic year go first, with ties broken by the seeded lottery.",
  },
};

/**
 * Default parameters for an allocation run.
 */
export const DEFAULT_OPTIONS = {
  seed: null, // null means generate a random numeric seed and store it
  priorityMode: "lottery",
  gender: "all", // "all" | "male" | "female" | "other"
  studentScope: "all", // "all" | "demo" | "real"
  includeUngrouped: true,
  defaultRoomSize: 2, // must be one of GROUP_SIZE_OPTIONS
  incompleteGroupPolicy: "shrink", // "shrink" | "waitlist"
  maxSwapPasses: 3,
  baselineTrials: 20,
};

/**
 * Point breakdown for scoring room preference satisfaction (Total: 100 points).
 * A preference that is "no-preference" or "any" counts as fully satisfied.
 */
export const PREFERENCE_POINTS = {
  hostelRank: {
    1: 50, // 1st choice hostel
    2: 35, // 2nd choice hostel
    3: 20, // 3rd choice hostel
    0: 0,  // Placed in hostel outside preferences list
  },
  acMatch: 30,    // Room AC matches group AC preference (or unit has no AC preference)
  floorMatch: 20, // Room floor band matches group floor preference (or unit has "any")
};

/**
 * Lifecycle states of an allocation run.
 */
export const RUN_STATUSES = ["running", "draft", "failed", "published", "discarded"];

/**
 * Reasons why a group or unit could not be assigned to a room and was waitlisted.
 */
export const WAITLIST_REASONS = {
  no_eligible_hostel: {
    code: "no_eligible_hostel",
    label: "No Eligible Hostel",
    description: "No active hostel allows this unit based on gender or academic year restrictions.",
  },
  no_room_of_this_size: {
    code: "no_room_of_this_size",
    label: "No Room of This Capacity",
    description: "No room of the unit's required capacity exists in any eligible hostel.",
  },
  all_matching_rooms_taken: {
    code: "all_matching_rooms_taken",
    label: "All Matching Rooms Filled",
    description: "Matching rooms existed but all were filled by higher priority units.",
  },
  ac_requirement_unmet: {
    code: "ac_requirement_unmet",
    label: "AC Deal-Breaker Unmet",
    description: "Available rooms cannot satisfy a member's strict AC deal-breaker constraint.",
  },
  no_compatible_partner: {
    code: "no_compatible_partner",
    label: "No Compatible Roommate",
    description: "Could not form a compatible group without violating lifestyle deal-breakers.",
  },
  incomplete_group_waitlisted: {
    code: "incomplete_group_waitlisted",
    label: "Incomplete Group Waitlisted",
    description: "Group had unfilled seats and the incomplete group policy was set to waitlist.",
  },
};

/**
 * Reasons why a student could not participate in the allocation run.
 */
export const UNALLOCATED_REASONS = {
  preferences_incomplete: {
    code: "preferences_incomplete",
    label: "Preferences Incomplete",
    description: "Student has not completed their lifestyle questionnaire.",
  },
  inactive_account: {
    code: "inactive_account",
    label: "Account Inactive",
    description: "Student account is marked inactive by administrators.",
  },
  no_compatible_partner: {
    code: "no_compatible_partner",
    label: "No Compatible Partner",
    description: "No compatible roommate found in the solo allocation pool.",
  },
};

/**
 * Maximum number of draft allocation runs retained in the database.
 * Older drafts are automatically pruned when a new run is saved.
 */
export const MAX_DRAFT_RUNS_KEPT = 10;
