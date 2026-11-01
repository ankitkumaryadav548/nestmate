/**
 * Pure Open-Seat Auto-Fill Planning Engine
 * 
 * PURE MODULE: Zero database / Mongoose dependencies, zero Next.js "@/" path aliases.
 * Matches unallocated pool students to open seats in roomed groups after the window closes.
 * 
 * INVARIANTS:
 * - Deterministic ordering and selection
 * - Strict same-gender isolation
 * - Strict same-roomSize match
 * - Mutual deal-breaker evaluation against ALL group members (including previous additions)
 * - Hostel eligibility and AC deal-breaker verification against the group's assigned room
 * - Never places a student into more than one seat
 */

import { canJoinGroup, calculateGroupScore } from "../matching/groupScore.js";
import { canJoinRoomedGroup } from "./roomState.js";

/**
 * Plans the assignment of available pool students to fill open seats in roomed groups.
 * 
 * @param {{
 *   roomedGroups: Array<{
 *     id: string,
 *     gender: string,
 *     targetSize: number,
 *     openSeats: number,
 *     roomClaimedAt: Date|string,
 *     selectedRoom: object,
 *     hostel?: object,
 *     members: Array<object>
 *   }>,
 *   poolStudents: Array<{
 *     id: string,
 *     gender: string,
 *     preferences: object,
 *     roomSize: number,
 *     year?: number
 *   }>,
 *   weights?: object,
 *   rooms?: Array<object>|Map<string, object>,
 *   hostels?: Array<object>|Map<string, object>
 * }} params
 * @returns {{
 *   additions: Array<{
 *     groupId: string,
 *     studentId: string,
 *     student: object,
 *     average: number,
 *     lowest: number
 *   }>,
 *   seatsStillOpen: Array<{
 *     groupId: string,
 *     count: number
 *   }>
 * }}
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

export function planOpenSeatFilling({
  roomedGroups = [],
  poolStudents = [],
  weights,
  rooms = [],
  hostels = [],
}) {
  const roomMap =
    rooms instanceof Map
      ? rooms
      : new Map((Array.isArray(rooms) ? rooms : []).map((r) => [toIdString(r), r]));

  const hostelMap =
    hostels instanceof Map
      ? hostels
      : new Map((Array.isArray(hostels) ? hostels : []).map((h) => [toIdString(h), h]));

  // 1. Sort roomed groups deterministically:
  //    (a) More open seats first (DESC)
  //    (b) Older roomClaimedAt first (ASC)
  //    (c) Group id ASC
  const sortedGroups = [...roomedGroups]
    .filter((g) => (g.openSeats || 0) > 0)
    .sort((a, b) => {
      const openA = a.openSeats || 0;
      const openB = b.openSeats || 0;
      if (openB !== openA) return openB - openA;

      const dateA = a.roomClaimedAt ? new Date(a.roomClaimedAt).getTime() : 0;
      const dateB = b.roomClaimedAt ? new Date(b.roomClaimedAt).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;

      return toIdString(a).localeCompare(toIdString(b));
    });

  const usedStudentIds = new Set();
  const additions = [];
  const seatsStillOpen = [];

  for (const group of sortedGroups) {
    const groupId = toIdString(group);
    let remainingSeats = group.openSeats || 0;

    // Resolve room and hostel
    const roomId = toIdString(group.selectedRoom);
    const room = roomMap.get(roomId) || (group.selectedRoom && typeof group.selectedRoom === "object" ? group.selectedRoom : null);
    const hostelId = toIdString(room?.hostel || group.hostel);
    const hostel = hostelMap.get(hostelId) || (room?.hostel && typeof room.hostel === "object" && room.hostel.gender ? room.hostel : null);

    if (!room || !hostel) {
      seatsStillOpen.push({ groupId, count: remainingSeats });
      continue;
    }

    // Track members including additions made in this round
    const currentMembers = [...(group.members || [])];

    while (remainingSeats > 0) {
      // Find candidate students from pool
      const eligibleCandidates = [];

      for (const candidate of poolStudents) {
        const candidateId = toIdString(candidate);
        if (usedStudentIds.has(candidateId)) continue;

        // Hard filters: gender and roomSize must match group
        const candidateGender = (candidate.gender || "").toLowerCase();
        const groupGender = (group.gender || "").toLowerCase();
        if (candidateGender !== groupGender) continue;

        const candidateRoomSize = Number(candidate.roomSize || candidate.preferences?.roomSize);
        if (candidateRoomSize !== Number(group.targetSize)) continue;

        // Constraint check 1: Can join the current member roster (deal-breakers & compatibility)
        const joinCheck = canJoinGroup(candidate, currentMembers, weights);
        if (!joinCheck.allowed) continue;

        // Constraint check 2: Can join the group's specific physical room & hostel (year & AC)
        const roomCheck = canJoinRoomedGroup(candidate, room, hostel);
        if (!roomCheck.ok) continue;

        // Calculate score if this candidate were added
        const fullScore = calculateGroupScore([...currentMembers, candidate], weights);

        eligibleCandidates.push({
          candidate,
          candidateId,
          average: fullScore.average,
          lowest: fullScore.lowest,
        });
      }

      if (eligibleCandidates.length === 0) {
        // No suitable candidate found for this seat
        break;
      }

      // Sort eligible candidates: highest average score DESC, highest lowest score DESC, candidateId ASC
      eligibleCandidates.sort((a, b) => {
        if (b.average !== a.average) return b.average - a.average;
        if (b.lowest !== a.lowest) return b.lowest - a.lowest;
        return a.candidateId.localeCompare(b.candidateId);
      });

      const best = eligibleCandidates[0];
      usedStudentIds.add(best.candidateId);
      currentMembers.push(best.candidate);
      remainingSeats -= 1;

      additions.push({
        groupId,
        studentId: best.candidateId,
        student: best.candidate,
        average: best.average,
        lowest: best.lowest,
      });
    }

    if (remainingSeats > 0) {
      seatsStillOpen.push({ groupId, count: remainingSeats });
    }
  }

  return {
    additions,
    seatsStillOpen,
  };
}

