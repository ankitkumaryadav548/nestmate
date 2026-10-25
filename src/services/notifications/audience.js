/**
 * Pure audience validation, filter specification, and description module.
 * 
 * Defines audience segmentation for campus announcements:
 * - all_students
 * - gender
 * - year
 * - hostel (active allocation in specified hostel)
 * - allocated (active room allocation)
 * - not_allocated (active students without an active room allocation)
 * - group_status (forming, complete, locked, or none)
 * 
 * Zero dependencies, no Mongoose, no "@/".
 */

import { ANNOUNCEMENT_AUDIENCES } from "../../config/notifications.js";

const VALID_GENDERS = ["male", "female", "other"];
const VALID_GROUP_STATUSES = ["forming", "complete", "locked", "none"];

/**
 * Validates and normalizes an audience descriptor.
 * 
 * @param {object} audience 
 * @returns {object} Normalized audience object
 * @throws {Error} If audience definition is invalid or unknown
 */
export function validateAudience(audience) {
  if (!audience || typeof audience !== "object") {
    throw new Error("Audience must be a non-null object");
  }

  const type = audience.type;
  if (!type || typeof type !== "string" || !ANNOUNCEMENT_AUDIENCES.includes(type)) {
    throw new Error(`Unknown or invalid audience type: "${type}". Allowed: ${ANNOUNCEMENT_AUDIENCES.join(", ")}`);
  }

  switch (type) {
    case "all_students":
      return { type: "all_students" };

    case "gender": {
      const g = (audience.gender || "").toLowerCase().trim();
      if (!VALID_GENDERS.includes(g)) {
        throw new Error(`Invalid gender "${audience.gender}". Must be one of: ${VALID_GENDERS.join(", ")}`);
      }
      return { type: "gender", gender: g };
    }

    case "year": {
      const y = Number(audience.year);
      if (!Number.isInteger(y) || y < 1 || y > 6) {
        throw new Error(`Invalid academic year "${audience.year}". Must be an integer between 1 and 6`);
      }
      return { type: "year", year: y };
    }

    case "hostel": {
      const hostelId = audience.hostelId ? String(audience.hostelId).trim() : "";
      if (!hostelId) {
        throw new Error("Hostel ID is required when targeting by hostel");
      }
      return { type: "hostel", hostelId };
    }

    case "allocated":
      return { type: "allocated" };

    case "not_allocated":
      return { type: "not_allocated" };

    case "group_status": {
      const status = (audience.status || "").toLowerCase().trim();
      if (!VALID_GROUP_STATUSES.includes(status)) {
        throw new Error(`Invalid group status "${audience.status}". Must be one of: ${VALID_GROUP_STATUSES.join(", ")}`);
      }
      return { type: "group_status", status };
    }

    default:
      throw new Error(`Unsupported audience type: ${type}`);
  }
}

/**
 * Builds a plain description of the database query pieces for testing and auditing.
 * 
 * @param {object} rawAudience 
 * @returns {object} Filter specification description
 */
export function buildAudienceFilterSpec(rawAudience) {
  const audience = validateAudience(rawAudience);

  const base = {
    role: "student",
    isActive: true,
  };

  switch (audience.type) {
    case "all_students":
      return base;

    case "gender":
      return { ...base, gender: audience.gender };

    case "year":
      return { ...base, year: audience.year };

    case "hostel":
      return { ...base, hostelId: audience.hostelId, activeAllocation: true };

    case "allocated":
      return { ...base, hasAllocation: true };

    case "not_allocated":
      return { ...base, hasAllocation: false };

    case "group_status":
      return { ...base, groupStatus: audience.status };

    default:
      return base;
  }
}

/**
 * Returns a human-friendly label describing the audience for previews, logs, and tables.
 * 
 * @param {object} rawAudience 
 * @param {object} [lookups={}] - Optional map of names (e.g. hostel names)
 * @returns {string}
 */
export function describeAudience(rawAudience, lookups = {}) {
  const audience = validateAudience(rawAudience);

  switch (audience.type) {
    case "all_students":
      return "All active students";

    case "gender": {
      const cap = audience.gender.charAt(0).toUpperCase() + audience.gender.slice(1);
      return `${cap} students`;
    }

    case "year":
      return `Year ${audience.year} students`;

    case "hostel": {
      const hostelName = lookups.hostelName || lookups[audience.hostelId];
      return hostelName
        ? `Students allocated in ${hostelName}`
        : `Students allocated in hostel (${audience.hostelId})`;
    }

    case "allocated":
      return "All allocated students";

    case "not_allocated":
      return "All unallocated students";

    case "group_status": {
      if (audience.status === "none") {
        return "Students with no group";
      }
      return `Students in ${audience.status} groups`;
    }

    default:
      return "Custom audience";
  }
}
