/**
 * Pure notification templates module.
 * 
 * Generates human-friendly, privacy-preserving notification titles, messages,
 * safe internal links, and severity levels.
 * 
 * Zero dependencies, no Mongoose, no "@/".
 */

import { TITLE_MAX, MESSAGE_MAX, NOTIFICATION_TYPES } from "../../config/notifications.js";
import { sanitizeLink } from "./linkValidator.js";

/**
 * Safely retrieves a string parameter with a fallback, ensuring 'undefined'
 * and 'null' literal strings are never emitted.
 * 
 * @param {any} val 
 * @param {string} fallback 
 * @returns {string}
 */
function safeStr(val, fallback) {
  if (val === undefined || val === null) return fallback;
  const s = String(val).trim();
  if (s === "" || s === "undefined" || s === "null") return fallback;
  return s;
}

/**
 * Cleans control characters, collapses whitespace, and truncates text to maxLength.
 * 
 * @param {string} text 
 * @param {number} maxLen 
 * @returns {string}
 */
function cleanAndTruncate(text, maxLen) {
  if (typeof text !== "string") text = String(text || "");
  // Strip control characters (ASCII 0-31 and 127)
  const stripped = text.replace(/[\x00-\x1F\x7F]/g, " ").replace(/\s+/g, " ").trim();
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen - 3).trimEnd() + "...";
}

/**
 * Builds a standardized notification object from a type and parameters.
 * 
 * @param {string} type - Registered notification type
 * @param {object} [params={}] - Interpolation values
 * @returns {{ title: string, message: string, link: string|null, severity: string }}
 * @throws {Error} If notification type is unregistered or unknown
 */
export function buildNotification(type, params = {}) {
  if (!type || typeof type !== "string") {
    throw new Error("A valid notification type string is required");
  }

  const p = params && typeof params === "object" ? params : {};

  let rawTitle = "";
  let rawMessage = "";
  let defaultLink = null;
  let severity = "info";

  switch (type) {
    // ==========================================
    // 1. INVITATIONS
    // ==========================================
    case "invitation_received": {
      const leaderName = safeStr(p.leaderName, "A group leader");
      const size = safeStr(p.size || p.targetSize, "multi");
      rawTitle = "New Roommate Invitation";
      rawMessage = `${leaderName} invited you to join a ${size}-bed room group.`;
      defaultLink = "/dashboard/invitations";
      severity = "info";
      break;
    }

    case "invitation_accepted": {
      const name = safeStr(p.name, "A student");
      rawTitle = "Invitation Accepted";
      rawMessage = `${name} accepted your invitation and joined your group.`;
      defaultLink = "/dashboard/group";
      severity = "success";
      break;
    }

    case "invitation_declined": {
      const name = safeStr(p.name, "A student");
      rawTitle = "Invitation Declined";
      rawMessage = `${name} declined your invitation to join the group.`;
      defaultLink = "/dashboard/group";
      severity = "warning";
      break;
    }

    case "invitation_cancelled": {
      rawTitle = "Invitation Cancelled";
      rawMessage = "An invitation to join a roommate group was withdrawn.";
      defaultLink = "/dashboard/invitations";
      severity = "info";
      break;
    }

    // ==========================================
    // 2. GROUPS
    // ==========================================
    case "group_member_joined": {
      const name = safeStr(p.name, "A new student");
      rawTitle = "New Roommate Joined";
      rawMessage = `${name} joined your roommate group.`;
      defaultLink = "/dashboard/group";
      severity = "info";
      break;
    }

    case "group_member_left": {
      const name = safeStr(p.name, "A member");
      const statusNote = p.statusChange ? ` ${safeStr(p.statusChange, "")}` : "";
      rawTitle = "Member Left Group";
      rawMessage = `${name} left your roommate group.${statusNote}`;
      defaultLink = "/dashboard/group";
      severity = "warning";
      break;
    }

    case "group_member_removed": {
      rawTitle = "Removed from Group";
      rawMessage = "You were removed from the roommate group by the group leader.";
      defaultLink = "/dashboard/group";
      severity = "warning";
      break;
    }

    case "group_complete": {
      rawTitle = "Roommate Group Complete";
      rawMessage = "Your group is complete. The warden will allocate a room soon.";
      defaultLink = "/dashboard/group";
      severity = "success";
      break;
    }

    case "group_disbanded": {
      rawTitle = "Group Disbanded";
      rawMessage = "Your roommate group has been disbanded.";
      defaultLink = "/dashboard/group";
      severity = "warning";
      break;
    }

    case "group_leader_changed": {
      const newLeaderName = safeStr(p.newLeaderName, "A member");
      rawTitle = "New Group Leader";
      rawMessage = `${newLeaderName} is now the leader of your roommate group.`;
      defaultLink = "/dashboard/group";
      severity = "info";
      break;
    }

    case "group_preferences_review": {
      rawTitle = "Room Preferences Review";
      rawMessage = "Your group composition changed. Please review and confirm your room preferences.";
      defaultLink = "/dashboard/group";
      severity = "warning";
      break;
    }

    // ==========================================
    // 3. ALLOCATION
    // ==========================================
    case "allocation_published": {
      const hostelName = safeStr(p.hostelName, "Assigned Hostel");
      const roomNumber = safeStr(p.roomNumber, "Assigned Room");
      rawTitle = "Room Allocated!";
      rawMessage = `Your room has been allocated: ${hostelName}, room ${roomNumber}.`;
      defaultLink = "/dashboard/room";
      severity = "success";
      break;
    }

    case "allocation_waitlisted": {
      const reason = safeStr(p.reason, "All eligible rooms for your group are currently filled.");
      rawTitle = "Allocation Waitlisted";
      rawMessage = `Your placement is waitlisted: ${reason}`;
      defaultLink = "/dashboard/room";
      severity = "warning";
      break;
    }

    case "allocation_unallocated": {
      const reason = safeStr(p.reason, "No eligible rooms were available during this run.");
      const nextStep = safeStr(p.nextStep, "Please review your preferences or contact the warden office.");
      rawTitle = "Allocation Update";
      rawMessage = `${reason} Next step: ${nextStep}`;
      defaultLink = "/dashboard/room";
      severity = "warning";
      break;
    }

    case "allocation_rolled_back": {
      rawTitle = "Allocation Withdrawn";
      rawMessage = "The allocation was withdrawn by the administration. You will be notified again.";
      defaultLink = "/dashboard/room";
      severity = "warning";
      break;
    }

    // ==========================================
    // 4. ANNOUNCEMENTS
    // ==========================================
    case "announcement": {
      rawTitle = safeStr(p.title, "Campus Announcement");
      rawMessage = safeStr(p.message, "A new announcement has been published by the administration.");
      defaultLink = sanitizeLink(p.link, null);
      severity = safeStr(p.severity, "info");
      break;
    }

    // ==========================================
    // 5. RESERVED (Not sent yet)
    // ==========================================
    case "room_change_submitted": {
      rawTitle = "Room Change Submitted";
      rawMessage = "Your room change request has been received and is under administrative review.";
      defaultLink = "/dashboard/room";
      severity = "info";
      break;
    }

    case "room_change_approved": {
      rawTitle = "Room Change Approved";
      rawMessage = "Your room change request has been approved. Check your room portal for details.";
      defaultLink = "/dashboard/room";
      severity = "success";
      break;
    }

    case "room_change_rejected": {
      rawTitle = "Room Change Request";
      rawMessage = "Your room change request could not be approved at this time.";
      defaultLink = "/dashboard/room";
      severity = "warning";
      break;
    }

    case "complaint_submitted": {
      rawTitle = "Complaint Submitted";
      rawMessage = "Your hostel complaint ticket has been logged.";
      defaultLink = "/dashboard";
      severity = "info";
      break;
    }

    case "complaint_status_updated": {
      rawTitle = "Complaint Status Updated";
      rawMessage = "There is an update on your submitted complaint ticket.";
      defaultLink = "/dashboard";
      severity = "info";
      break;
    }

    default:
      throw new Error(`Unknown or unsupported notification type: "${type}"`);
  }

  const title = cleanAndTruncate(rawTitle, TITLE_MAX);
  const message = cleanAndTruncate(rawMessage, MESSAGE_MAX);
  const link = defaultLink ? sanitizeLink(defaultLink, null) : null;

  return {
    title,
    message,
    link,
    severity,
  };
}
