/**
 * Pure Room Preferences & Hostel Eligibility Logic (Phase 4 Part 2)
 * 
 * PURE MODULE: Zero database / Mongoose dependencies, zero Next.js "@/" path aliases.
 * Designed for full unit testability and viva / technical presentation explainability.
 */

import {
  MAX_PREFERRED_HOSTELS,
  AC_OPTIONS,
  FLOOR_OPTIONS,
} from "../../config/roomPreferences.js";

/**
 * Checks if a given floor matches a floor band preference for a hostel.
 * 
 * Rules:
 * - "any": Always matches any floor.
 * - For hostels with 1 floor (floor 0): matches low, mid, high, and any.
 * - For hostels with 2 floors (floors 0 and 1):
 *     - floor 0 matches "low"
 *     - floor 1 matches "high"
 *     - "mid" matches both floors (since no intermediate floor exists).
 * - For hostels with 3+ floors (0 to totalFloors - 1):
 *     - Divided into bottom third, middle third, top third.
 *     - low: floor < floor(N / 3)
 *     - high: floor >= N - floor(N / 3)
 *     - mid: floor >= floor(N / 3) and floor < N - floor(N / 3)
 * 
 * @param {number} floor - 0-indexed floor number
 * @param {number} totalFloors - Total floors in the hostel (e.g. 4)
 * @param {string} band - "low" | "mid" | "high" | "any"
 * @returns {boolean}
 */
export function floorMatchesBand(floor, totalFloors, band) {
  if (typeof floor !== "number" || typeof totalFloors !== "number") return false;
  if (totalFloors <= 0 || floor < 0 || floor >= totalFloors) return false;
  if (band === "any") return true;

  // Single floor hostel (ground floor only) matches all band categories
  if (totalFloors === 1) {
    return true;
  }

  // 2-floor hostel: Floor 0 is low, Floor 1 is high, and mid accommodates either floor
  if (totalFloors === 2) {
    if (band === "low") return floor === 0;
    if (band === "high") return floor === 1;
    if (band === "mid") return true;
    return false;
  }

  // 3+ floors: Equal three-way proportional banding
  const lowThreshold = Math.floor(totalFloors / 3);
  const highThreshold = totalFloors - Math.floor(totalFloors / 3);

  if (band === "low") return floor < lowThreshold;
  if (band === "high") return floor >= highThreshold;
  if (band === "mid") return floor >= lowThreshold && floor < highThreshold;

  return false;
}

/**
 * Determines whether a hostel is eligible for a group of students.
 * 
 * Hard Rules:
 * 1. The hostel must be active (isActive !== false).
 * 2. Gender matching:
 *    - male members: hostel must be "boys" or "mixed"
 *    - female members: hostel must be "girls" or "mixed"
 *    - other members: hostel must be "mixed"
 * 3. Academic year: If hostel.allowedYears is specified and non-empty,
 *    EVERY member's academic year must be allowed by the hostel.
 * 
 * @param {object} hostel - { gender, isActive, allowedYears }
 * @param {Array<object>} members - Array of { gender, year }
 * @returns {{ eligible: boolean, reason: string | null }}
 */
export function isHostelEligibleForGroup(hostel, members) {
  if (!hostel || hostel.isActive === false) {
    return { eligible: false, reason: "inactive" };
  }

  if (!Array.isArray(members) || members.length === 0) {
    return { eligible: true, reason: null };
  }

  // Check gender compatibility for every member
  const hostelGender = hostel.gender;
  for (const member of members) {
    const mg = member.gender ? member.gender.toLowerCase() : "";
    if (mg === "male") {
      if (hostelGender !== "boys" && hostelGender !== "mixed") {
        return { eligible: false, reason: "gender" };
      }
    } else if (mg === "female") {
      if (hostelGender !== "girls" && hostelGender !== "mixed") {
        return { eligible: false, reason: "gender" };
      }
    } else {
      // "other" gender requires mixed hostel
      if (hostelGender !== "mixed") {
        return { eligible: false, reason: "gender" };
      }
    }
  }

  // Check academic year compatibility for every member
  if (Array.isArray(hostel.allowedYears) && hostel.allowedYears.length > 0) {
    const allowedSet = new Set(hostel.allowedYears.map((y) => Number(y)));
    for (const member of members) {
      if (member.year === null || member.year === undefined || !allowedSet.has(Number(member.year))) {
        return { eligible: false, reason: "year" };
      }
    }
  }

  return { eligible: true, reason: null };
}

/**
 * Checks if a proposed group AC choice conflicts with any member's strict AC deal-breaker.
 * 
 * A conflict occurs ONLY IF:
 * 1. A member has "acType" in their dealBreakers list, AND
 * 2. The group's choice directly contradicts that member's preference
 *    (e.g., member requires "ac" but group chose "non-ac", or vice versa).
 * 
 * Note: "no-preference" never conflicts with any deal-breaker.
 * 
 * @param {string} groupAcType - "ac" | "non-ac" | "no-preference"
 * @param {Array<object>} members - Array of members with preferences { acPreference, dealBreakers }
 * @returns {{ conflict: boolean, memberIndexes: Array<number> }}
 */
export function resolveAcConflict(groupAcType, members) {
  if (!groupAcType || groupAcType === "no-preference" || !Array.isArray(members)) {
    return { conflict: false, memberIndexes: [] };
  }

  const conflictingIndexes = [];

  members.forEach((member, idx) => {
    const prefs = member.preferences || member;
    const dealBreakers = Array.isArray(prefs.dealBreakers) ? prefs.dealBreakers : [];
    const hasAcDealBreaker = dealBreakers.includes("acType");

    if (hasAcDealBreaker) {
      const memberPref = prefs.acPreference;
      if (memberPref === "ac" && groupAcType === "non-ac") {
        conflictingIndexes.push(idx);
      } else if (memberPref === "non-ac" && groupAcType === "ac") {
        conflictingIndexes.push(idx);
      }
    }
  });

  return {
    conflict: conflictingIndexes.length > 0,
    memberIndexes: conflictingIndexes,
  };
}

/**
 * Suggests a default AC type based on members' preferences.
 * 
 * Rules:
 * - If every member with an explicit preference agrees on "ac", suggest "ac".
 * - If every member with an explicit preference agrees on "non-ac", suggest "non-ac".
 * - If members disagree or all are "no-preference", suggest "no-preference".
 * 
 * @param {Array<object>} members - Array of members with preferences
 * @returns {string} "ac" | "non-ac" | "no-preference"
 */
export function suggestDefaultAcType(members) {
  if (!Array.isArray(members) || members.length === 0) {
    return "no-preference";
  }

  let hasAc = false;
  let hasNonAc = false;

  for (const member of members) {
    const prefs = member.preferences || member;
    const p = prefs.acPreference;
    if (p === "ac") hasAc = true;
    if (p === "non-ac") hasNonAc = true;
  }

  if (hasAc && !hasNonAc) return "ac";
  if (hasNonAc && !hasAc) return "non-ac";
  return "no-preference";
}

/**
 * Normalizes user-submitted preferences:
 * - Trims strings and filters out empty values
 * - Removes duplicate hostels while strictly preserving submission priority order
 * - Enforces the maximum hostel count (MAX_PREFERRED_HOSTELS = 3)
 * - Validates acType and floorPreference against allowed enum sets
 * 
 * @param {object} input - { preferredHostels, acType, floorPreference }
 * @returns {{ preferredHostels: Array<string>, acType: string, floorPreference: string }}
 */
export function normalizePreferences(input = {}) {
  const rawHostels = Array.isArray(input.preferredHostels) ? input.preferredHostels : [];

  const seen = new Set();
  const normalizedHostels = [];

  for (const h of rawHostels) {
    if (!h) continue;
    const strId = String(h).trim();
    if (strId && !seen.has(strId)) {
      seen.add(strId);
      normalizedHostels.push(strId);
      if (normalizedHostels.length >= MAX_PREFERRED_HOSTELS) {
        break;
      }
    }
  }

  const acType = AC_OPTIONS.includes(input.acType) ? input.acType : "no-preference";
  const floorPreference = FLOOR_OPTIONS.includes(input.floorPreference) ? input.floorPreference : "any";

  return {
    preferredHostels: normalizedHostels,
    acType,
    floorPreference,
  };
}
