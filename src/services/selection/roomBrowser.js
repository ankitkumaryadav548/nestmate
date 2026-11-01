/**
 * Pure Room Browser & Annotation Engine
 * 
 * PURE MODULE: Zero database / Mongoose dependencies, zero Next.js "@/" path aliases.
 * Filters free rooms, computes preference satisfaction, annotates badges, and sorts.
 * STRICT PRIVACY: NEVER attaches occupant records or student details.
 */

import { canClaimRoom } from "./roomState.js";
import { preferenceScore } from "../allocation/roomPlacement.js";

/**
 * Natural sorting comparison for room numbers (e.g. "101", "102", "110", "A-1").
 */
export function compareRoomNumbers(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Annotates valid selectable rooms for a unit based on its room preferences.
 * 
 * Each annotated room contains:
 * - room properties (id, roomNumber, floor, capacity, roomType)
 * - hostel summary (id, name, code, gender, totalFloors, facilities)
 * - preference metrics:
 *     - preferenceScore (0 - 100)
 *     - hostelRank (1 to 3, or 0 if unranked)
 *     - acMatch (true | false | null)
 *     - floorMatch (true | false | null)
 *     - softMismatches: Array<string>
 * 
 * Sorting order:
 * 1. preferenceScore DESC
 * 2. hostel.code ASC
 * 3. room.floor ASC
 * 4. room.roomNumber natural ASC
 * 
 * @param {Array<object>} rooms - Array of raw room objects
 * @param {Array<object>|Map<string, object>} hostels - Hostels collection or map
 * @param {{
 *   size: number,
 *   members: Array<object>,
 *   roomPreferences?: { preferredHostels?: Array<any>, acType?: string, floorPreference?: string }
 * }} unit
 * @returns {Array<object>}
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

export function annotateRoomsForUnit(rooms = [], hostels = [], unit) {
  if (!Array.isArray(rooms) || !unit) return [];

  // Index hostels by ID for quick lookup
  const hostelMap =
    hostels instanceof Map
      ? hostels
      : new Map(
          (Array.isArray(hostels) ? hostels : []).map((h) => [
            toIdString(h),
            h,
          ])
        );

  const annotated = [];

  for (const room of rooms) {
    const hostelId = toIdString(room.hostel);
    const hostel = hostelMap.get(hostelId) || (room.hostel && typeof room.hostel === "object" && room.hostel.gender ? room.hostel : null);

    if (!hostel) continue;

    // Hard filtering: must pass canClaimRoom
    const claimCheck = canClaimRoom(room, hostel, unit);
    if (!claimCheck.ok) {
      continue;
    }

    // Compute preference score & match properties
    const scoreResult = preferenceScore(unit, room, hostel);
    const softMismatches = [];

    if (scoreResult.hostelRank === 0) {
      softMismatches.push("Not in your top 3 preferred hostels");
    }
    if (scoreResult.acMatch === false) {
      softMismatches.push(
        room.roomType === "AC"
          ? "AC room (preferred Non-AC)"
          : "Non-AC room (preferred AC)"
      );
    }
    if (scoreResult.floorMatch === false) {
      softMismatches.push("Outside preferred floor range");
    }

    annotated.push({
      id: String(room.id || room._id),
      _id: room._id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      capacity: room.capacity,
      roomType: room.roomType,
      status: room.status,
      hostel: {
        id: String(hostel.id || hostel._id),
        _id: hostel._id,
        name: hostel.name,
        code: hostel.code,
        gender: hostel.gender,
        totalFloors: hostel.totalFloors,
        facilities: hostel.facilities || [],
      },
      preferenceScore: scoreResult.score,
      hostelRank: scoreResult.hostelRank,
      acMatch: scoreResult.acMatch,
      floorMatch: scoreResult.floorMatch,
      softMismatches,
    });
  }

  // Sort: preferenceScore DESC, hostel.code ASC, room.floor ASC, roomNumber ASC
  annotated.sort((a, b) => {
    if (b.preferenceScore !== a.preferenceScore) {
      return b.preferenceScore - a.preferenceScore;
    }
    const codeA = String(a.hostel.code || "");
    const codeB = String(b.hostel.code || "");
    const codeCmp = codeA.localeCompare(codeB);
    if (codeCmp !== 0) return codeCmp;

    if (a.floor !== b.floor) {
      return a.floor - b.floor;
    }

    return compareRoomNumbers(a.roomNumber, b.roomNumber);
  });

  return annotated;
}

