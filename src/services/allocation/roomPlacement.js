/**
 * Pure Room Placement & Preference Matching Engine
 * 
 * DATA SHAPES:
 * - student: {
 *     id: string,
 *     name: string,
 *     gender: "male" | "female" | "other",
 *     year: number,
 *     course?: string,
 *     department?: string,
 *     registrationNumber?: string,
 *     preferences: {
 *       sleepSchedule?: string,
 *       studyTime?: string,
 *       cleanliness?: number,
 *       noiseTolerance?: number,
 *       socialLevel?: number,
 *       acPreference?: "ac" | "non-ac" | "no-preference",
 *       foodType?: string,
 *       okWithDifferentFood?: boolean,
 *       languages?: string[],
 *       nightCalls?: string,
 *       dealBreakers?: string[]
 *     }
 *   }
 * - unit: {
 *     unitId: string,
 *     kind: "group" | "filled-group" | "shrunk-group" | "pool-group",
 *     sourceGroupId: string | null,
 *     members: student[],
 *     size: number,
 *     roomPreferences: {
 *       preferredHostels: string[], // Array of hostel IDs in order of priority (up to 3)
 *       acType: "ac" | "non-ac" | "no-preference",
 *       floorPreference: "low" | "mid" | "high" | "any"
 *     },
 *     completedAtMs: number | null,
 *     groupAverage: number,
 *     groupLowest: number
 *   }
 * - room: {
 *     id: string,
 *     hostelId: string,
 *     roomNumber: string,
 *     floor: number,
 *     capacity: number,
 *     roomType: "AC" | "Non-AC"
 *   }
 * - hostel: {
 *     id: string,
 *     code: string,
 *     name: string,
 *     gender: "boys" | "girls" | "mixed",
 *     isActive: boolean,
 *     allowedYears: number[],
 *     totalFloors: number
 *   }
 */

import { PREFERENCE_POINTS } from "../../config/allocation.js";
import { floorMatchesBand, isHostelEligibleForGroup } from "../roomPreferences/preferenceLogic.js";
import { createRng, shuffle } from "./rng.js";

/**
 * Checks if a room and its hostel satisfy hard constraints for the unit members.
 * 
 * Hard Rules:
 * 1. Hostel must be active, gender-compatible, and allow every member's academic year.
 * 2. If any member has the strict "acType" deal-breaker with an explicit AC choice,
 *    the room's roomType ("AC" or "Non-AC") must match it exactly.
 * 
 * @param {object} room 
 * @param {object} hostel 
 * @param {Array<object>} members 
 * @returns {boolean}
 */
export function roomMeetsHardConstraints(room, hostel, members = []) {
  if (!room || !hostel) return false;

  // 1. Hostel eligibility for group members
  const eligibility = isHostelEligibleForGroup(hostel, members);
  if (!eligibility.eligible) {
    return false;
  }

  // 2. Strict AC deal-breaker constraint
  for (const member of members) {
    const prefs = member.preferences || member;
    const dealBreakers = Array.isArray(prefs.dealBreakers) ? prefs.dealBreakers : [];
    if (dealBreakers.includes("acType")) {
      const needed = prefs.acPreference;
      if (needed === "ac" && room.roomType !== "AC") {
        return false;
      }
      if (needed === "non-ac" && room.roomType !== "Non-AC") {
        return false;
      }
    }
  }

  return true;
}

/**
 * Merges room preferences for pool-formed groups using collective voting rules.
 * 
 * Rules:
 * - Hostels: Borda count over preferred hostel lists (Rank 1 = 3 pts, Rank 2 = 2 pts, Rank 3 = 1 pt).
 *   Top 3 selected with deterministic string ID tie-breaking.
 * - AC Type: If all members with an explicit choice ("ac" or "non-ac") agree, choose that; otherwise "no-preference".
 * - Floor: Most common non-"any" floor preference; otherwise "any".
 * - Fallbacks: Members without saved preferences contribute their questionnaire acPreference and floor "any".
 * 
 * @param {Array<object>} membersPrefs - Array of member preferences or student objects
 * @returns {{ preferredHostels: string[], acType: string, floorPreference: string }}
 */
export function mergeRoomPreferences(membersPrefs = []) {
  const hostelPoints = new Map();
  const explicitAcList = [];
  const floorCounts = { low: 0, mid: 0, high: 0 };
  let nonAnyFloorCount = 0;

  for (const item of membersPrefs) {
    const rawPrefs = item.roomPreferences || item.preferences || item;
    const preferredHostels = Array.isArray(rawPrefs.preferredHostels) ? rawPrefs.preferredHostels : [];

    // Borda count for preferred hostels
    preferredHostels.slice(0, 3).forEach((hostelId, index) => {
      if (!hostelId) return;
      const strId = String(hostelId);
      const points = 3 - index; // 3 for rank 1, 2 for rank 2, 1 for rank 3
      hostelPoints.set(strId, (hostelPoints.get(strId) || 0) + points);
    });

    // AC preference consensus
    const ac = rawPrefs.acType || rawPrefs.acPreference;
    if (ac === "ac" || ac === "non-ac") {
      explicitAcList.push(ac);
    }

    // Floor preference vote
    const floor = rawPrefs.floorPreference;
    if (floor === "low" || floor === "mid" || floor === "high") {
      floorCounts[floor] = (floorCounts[floor] || 0) + 1;
      nonAnyFloorCount++;
    }
  }

  // 1. Sort hostels by Borda points descending, tie-break by ID
  const sortedHostels = Array.from(hostelPoints.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .map((entry) => entry[0])
    .slice(0, 3);

  // 2. AC preference resolution
  let mergedAc = "no-preference";
  if (explicitAcList.length > 0) {
    const allAc = explicitAcList.every((val) => val === "ac");
    const allNonAc = explicitAcList.every((val) => val === "non-ac");
    if (allAc) mergedAc = "ac";
    else if (allNonAc) mergedAc = "non-ac";
  }

  // 3. Floor preference majority
  let mergedFloor = "any";
  if (nonAnyFloorCount > 0) {
    let maxVotes = 0;
    const priority = ["low", "mid", "high"];
    for (const f of priority) {
      if (floorCounts[f] > maxVotes) {
        maxVotes = floorCounts[f];
        mergedFloor = f;
      }
    }
  }

  return {
    preferredHostels: sortedHostels,
    acType: mergedAc,
    floorPreference: mergedFloor,
  };
}

/**
 * Computes preference satisfaction breakdown and score for a unit placed in a given room.
 * Total points: 100 (hostelRank: 50/35/20/0, acMatch: 30, floorMatch: 20).
 * 
 * @param {object} unit 
 * @param {object} room 
 * @param {object} hostel 
 * @returns {{
 *   score: number,
 *   hostelRank: number,
 *   acMatch: boolean | null,
 *   floorMatch: boolean | null
 * }}
 */
export function preferenceScore(unit, room, hostel) {
  const prefs = unit.roomPreferences || {};
  const preferredHostels = Array.isArray(prefs.preferredHostels) ? prefs.preferredHostels : [];

  // 1. Hostel Rank
  const hostelStrId = String(hostel.id || hostel._id);
  const rankIdx = preferredHostels.findIndex((id) => String(id) === hostelStrId);
  const hostelRank = rankIdx >= 0 ? rankIdx + 1 : 0;
  const hostelPts = PREFERENCE_POINTS.hostelRank[hostelRank] || 0;

  // 2. AC Match
  let acMatch = null;
  let acPts = PREFERENCE_POINTS.acMatch; // Full points if no specific preference
  if (prefs.acType === "ac") {
    acMatch = room.roomType === "AC";
    acPts = acMatch ? PREFERENCE_POINTS.acMatch : 0;
  } else if (prefs.acType === "non-ac") {
    acMatch = room.roomType === "Non-AC";
    acPts = acMatch ? PREFERENCE_POINTS.acMatch : 0;
  }

  // 3. Floor Match
  let floorMatch = null;
  let floorPts = PREFERENCE_POINTS.floorMatch; // Full points if "any"
  if (prefs.floorPreference && prefs.floorPreference !== "any") {
    floorMatch = floorMatchesBand(room.floor, hostel.totalFloors, prefs.floorPreference);
    floorPts = floorMatch ? PREFERENCE_POINTS.floorMatch : 0;
  }

  return {
    score: hostelPts + acPts + floorPts,
    hostelRank,
    acMatch,
    floorMatch,
  };
}

/**
 * Places groups into rooms using priority rounds:
 * - Round 1: Everyone tries their 1st-choice hostel
 * - Round 2: Everyone tries their 2nd-choice hostel
 * - Round 3: Everyone tries their 3rd-choice hostel
 * - Round 4: Fallback to best eligible room
 * 
 * @param {Array<object>} units 
 * @param {Array<object>} rooms 
 * @param {Array<object>|Map<string, object>} hostels 
 * @param {object} options - { seed, priorityMode }
 * @returns {{
 *   assignments: Array<object>,
 *   waitlist: Array<{ unitId: string, reason: string, unit: object }>
 * }}
 */
export function placeUnits(units = [], rooms = [], hostels = [], options = {}) {
  const rng = createRng(options.seed);
  const priorityMode = options.priorityMode || "lottery";

  // Build hostel map by string ID
  const hostelMap = new Map();
  if (Array.isArray(hostels)) {
    for (const h of hostels) {
      hostelMap.set(String(h.id || h._id), h);
    }
  } else if (hostels instanceof Map) {
    for (const [k, v] of hostels.entries()) {
      hostelMap.set(String(k), v);
    }
  }

  // Tracking free rooms: Map of id -> room
  const freeRooms = new Map();
  for (const r of rooms) {
    freeRooms.set(String(r.id || r._id), {
      ...r,
      id: String(r.id || r._id),
      hostelId: String(r.hostelId || r.hostel || (r.hostel && r.hostel._id)),
    });
  }

  // 1. Establish deterministic priority ordering among units
  // First, assign a lottery index via seeded shuffle
  const lotteryOrdered = shuffle(units, rng);
  const lotteryIndexMap = new Map();
  lotteryOrdered.forEach((u, i) => lotteryIndexMap.set(u.unitId, i));

  const sortedUnits = [...units].sort((a, b) => {
    if (priorityMode === "completedAt") {
      const aTime = typeof a.completedAtMs === "number" ? a.completedAtMs : Infinity;
      const bTime = typeof b.completedAtMs === "number" ? b.completedAtMs : Infinity;
      if (aTime !== bTime) return aTime - bTime;
      return (lotteryIndexMap.get(a.unitId) || 0) - (lotteryIndexMap.get(b.unitId) || 0);
    }

    if (priorityMode === "seniority") {
      const aYear = a.members.length > 0 ? a.members.reduce((acc, m) => acc + (m.year || 1), 0) / a.members.length : 1;
      const bYear = b.members.length > 0 ? b.members.reduce((acc, m) => acc + (m.year || 1), 0) / b.members.length : 1;
      if (bYear !== aYear) return bYear - aYear; // Higher average year first
      return (lotteryIndexMap.get(a.unitId) || 0) - (lotteryIndexMap.get(b.unitId) || 0);
    }

    // Default "lottery"
    return (lotteryIndexMap.get(a.unitId) || 0) - (lotteryIndexMap.get(b.unitId) || 0);
  });

  const assignments = [];
  const placedUnitIds = new Set();

  /**
   * Room number natural comparison for deterministic sorting (e.g. "101" < "102" < "1010")
   */
  const compareRoomNumbers = (numA, numB) => {
    return String(numA).localeCompare(String(numB), undefined, { numeric: true, sensitivity: "base" });
  };

  // Helper to filter free candidate rooms
  const getFreeRoomsForHostel = (hostelId, capacity) => {
    const list = [];
    for (const r of freeRooms.values()) {
      if (r.hostelId === hostelId && r.capacity === capacity) {
        list.push(r);
      }
    }
    return list;
  };

  // 2. Rounds 1, 2, and 3: Prioritized choices
  for (let round = 1; round <= 3; round++) {
    for (const unit of sortedUnits) {
      if (placedUnitIds.has(unit.unitId)) continue;

      const prefs = unit.roomPreferences || {};
      const preferredHostels = Array.isArray(prefs.preferredHostels) ? prefs.preferredHostels : [];
      const targetHostelId = preferredHostels[round - 1];
      if (!targetHostelId) continue;

      const hostel = hostelMap.get(String(targetHostelId));
      if (!hostel) continue;

      // Filter eligible candidate rooms in target hostel
      const candidates = getFreeRoomsForHostel(String(targetHostelId), unit.size).filter((room) => {
        // Hard constraints: gender, allowedYears, strict AC deal-breaker
        if (!roomMeetsHardConstraints(room, hostel, unit.members)) {
          return false;
        }

        // Soft AC preference in rounds 1-3
        if (prefs.acType === "ac" && room.roomType !== "AC") return false;
        if (prefs.acType === "non-ac" && room.roomType !== "Non-AC") return false;

        return true;
      });

      if (candidates.length === 0) continue;

      // Deterministic candidate selection:
      // 1. Best floor band match
      // 2. Lowest floor
      // 3. Lowest room number (natural sort)
      candidates.sort((a, b) => {
        const aFloorMatch = floorMatchesBand(a.floor, hostel.totalFloors, prefs.floorPreference);
        const bFloorMatch = floorMatchesBand(b.floor, hostel.totalFloors, prefs.floorPreference);
        if (aFloorMatch !== bFloorMatch) {
          return aFloorMatch ? -1 : 1;
        }
        if (a.floor !== b.floor) {
          return a.floor - b.floor;
        }
        return compareRoomNumbers(a.roomNumber, b.roomNumber);
      });

      const chosenRoom = candidates[0];
      const satisfaction = preferenceScore(unit, chosenRoom, hostel);

      // Record assignment
      assignments.push({
        unitId: unit.unitId,
        unit,
        room: chosenRoom,
        roomId: chosenRoom.id,
        hostel,
        hostelId: hostel.id || hostel._id,
        hostelRank: round,
        acMatch: satisfaction.acMatch,
        floorMatch: satisfaction.floorMatch,
        preferenceScore: satisfaction.score,
        round,
        order: assignments.length + 1,
      });

      freeRooms.delete(chosenRoom.id);
      placedUnitIds.add(unit.unitId);
    }
  }

  // 3. Round 4: Fallback round across ALL eligible hostels
  for (const unit of sortedUnits) {
    if (placedUnitIds.has(unit.unitId)) continue;

    const prefs = unit.roomPreferences || {};
    const candidateRoomsWithScores = [];

    // Check all free rooms with exact capacity across all eligible hostels
    for (const room of freeRooms.values()) {
      if (room.capacity !== unit.size) continue;
      const hostel = hostelMap.get(room.hostelId);
      if (!hostel) continue;

      if (!roomMeetsHardConstraints(room, hostel, unit.members)) {
        continue;
      }

      // AC preference is soft in fallback round (deal-breakers already enforced above)
      const satisfaction = preferenceScore(unit, room, hostel);
      candidateRoomsWithScores.push({
        room,
        hostel,
        score: satisfaction.score,
        hostelRank: satisfaction.hostelRank,
        acMatch: satisfaction.acMatch,
        floorMatch: satisfaction.floorMatch,
      });
    }

    if (candidateRoomsWithScores.length === 0) continue;

    // Pick candidate with highest preferenceScore, ties broken by hostel code, floor, room number
    candidateRoomsWithScores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const codeComp = String(a.hostel.code || "").localeCompare(String(b.hostel.code || ""));
      if (codeComp !== 0) return codeComp;
      if (a.room.floor !== b.room.floor) return a.room.floor - b.room.floor;
      return compareRoomNumbers(a.room.roomNumber, b.room.roomNumber);
    });

    const chosen = candidateRoomsWithScores[0];

    assignments.push({
      unitId: unit.unitId,
      unit,
      room: chosen.room,
      roomId: chosen.room.id,
      hostel: chosen.hostel,
      hostelId: chosen.hostel.id || chosen.hostel._id,
      hostelRank: chosen.hostelRank,
      acMatch: chosen.acMatch,
      floorMatch: chosen.floorMatch,
      preferenceScore: chosen.score,
      round: 4,
      order: assignments.length + 1,
    });

    freeRooms.delete(chosen.room.id);
    placedUnitIds.add(unit.unitId);
  }

  // 4. Waitlist units that could not be assigned
  const waitlist = [];
  for (const unit of sortedUnits) {
    if (placedUnitIds.has(unit.unitId)) continue;

    // Determine specific waitlist reason
    let hasEligibleHostel = false;
    let hasRoomOfSizeInEligibleHostel = false;
    let hadAcConflictOnAllFreeRooms = false;

    // Check eligible hostels
    const eligibleHostels = [];
    for (const h of hostelMap.values()) {
      if (isHostelEligibleForGroup(h, unit.members).eligible) {
        eligibleHostels.push(h);
      }
    }

    if (eligibleHostels.length === 0) {
      waitlist.push({
        unitId: unit.unitId,
        reason: "no_eligible_hostel",
        unit,
      });
      continue;
    }

    // Check rooms of this capacity across all rooms (free or taken)
    const eligibleHostelIds = new Set(eligibleHostels.map((h) => String(h.id || h._id)));
    for (const r of rooms) {
      const hId = String(r.hostelId || r.hostel || (r.hostel && r.hostel._id));
      if (eligibleHostelIds.has(hId) && r.capacity === unit.size) {
        hasRoomOfSizeInEligibleHostel = true;
        break;
      }
    }

    if (!hasRoomOfSizeInEligibleHostel) {
      waitlist.push({
        unitId: unit.unitId,
        reason: "no_room_of_this_size",
        unit,
      });
      continue;
    }

    // Check if free rooms existed but were rejected solely because of strict AC deal-breaker
    const freeRoomsOfSize = [];
    for (const r of freeRooms.values()) {
      if (eligibleHostelIds.has(r.hostelId) && r.capacity === unit.size) {
        freeRoomsOfSize.push(r);
      }
    }

    if (freeRoomsOfSize.length > 0) {
      const allFailedAc = freeRoomsOfSize.every((r) => {
        const hostel = hostelMap.get(r.hostelId);
        return !roomMeetsHardConstraints(r, hostel, unit.members);
      });
      if (allFailedAc) {
        hadAcConflictOnAllFreeRooms = true;
      }
    }

    if (hadAcConflictOnAllFreeRooms) {
      waitlist.push({
        unitId: unit.unitId,
        reason: "ac_requirement_unmet",
        unit,
      });
      continue;
    }

    // Otherwise, rooms were simply occupied by higher-priority units
    waitlist.push({
      unitId: unit.unitId,
      reason: "all_matching_rooms_taken",
      unit,
    });
  }

  return { assignments, waitlist };
}
