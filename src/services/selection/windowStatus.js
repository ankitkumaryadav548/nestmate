/**
 * Pure Selection Window Status Module
 * 
 * PURE MODULE: Zero database / Mongoose dependencies, zero Next.js "@/" path aliases.
 */

import { MIN_WINDOW_MINUTES } from "../../config/selection.js";

/**
 * Computes the effective status of a selection window.
 * 
 * Rules:
 * 1. If finalizedAt is present -> "finalized"
 * 2. If closedAt is present OR now >= endsAt -> "closed"
 * 3. If now >= startsAt -> "open"
 * 4. Otherwise -> "scheduled"
 * 
 * @param {object|null} window
 * @param {Date|string|number} [now=new Date()]
 * @returns {"scheduled" | "open" | "closed" | "finalized" | null}
 */
export function effectiveWindowStatus(window, now = new Date()) {
  if (!window) return null;

  const nowDate = new Date(now).getTime();

  if (window.finalizedAt) {
    return "finalized";
  }

  if (window.closedAt) {
    return "closed";
  }

  const endsAtTime = window.endsAt ? new Date(window.endsAt).getTime() : 0;
  if (endsAtTime && nowDate >= endsAtTime) {
    return "closed";
  }

  const startsAtTime = window.startsAt ? new Date(window.startsAt).getTime() : 0;
  if (startsAtTime && nowDate >= startsAtTime) {
    return "open";
  }

  return "scheduled";
}

/**
 * Validates selection window creation and update inputs.
 * 
 * Rules:
 * - Both startsAt and endsAt must be valid dates.
 * - endsAt must be in the future (endsAt > now).
 * - endsAt must be at least MIN_WINDOW_MINUTES after startsAt.
 * 
 * @param {{ startsAt: string|Date, endsAt: string|Date }} input
 * @param {Date|string|number} [now=new Date()]
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateWindowInput({ startsAt, endsAt }, now = new Date()) {
  if (!startsAt) {
    return { valid: false, error: "Start date is required" };
  }
  if (!endsAt) {
    return { valid: false, error: "End date is required" };
  }

  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);
  const nowDate = new Date(now);

  if (isNaN(startDate.getTime())) {
    return { valid: false, error: "Start date is required" };
  }
  if (isNaN(endDate.getTime())) {
    return { valid: false, error: "End date is required" };
  }

  if (endDate.getTime() <= nowDate.getTime()) {
    return { valid: false, error: "End must be in the future" };
  }

  const minDurationMs = MIN_WINDOW_MINUTES * 60 * 1000;
  if (endDate.getTime() - startDate.getTime() < minDurationMs) {
    return {
      valid: false,
      error: "End must be at least 5 minutes after start",
    };
  }

  return { valid: true, error: null };
}

/**
 * Returns milliseconds remaining until target date (clamped to 0).
 * 
 * @param {Date|string|number} targetDate
 * @param {Date|string|number} [now=new Date()]
 * @returns {number}
 */
export function msUntil(targetDate, now = new Date()) {
  if (!targetDate) return 0;
  const target = new Date(targetDate).getTime();
  const current = new Date(now).getTime();
  return Math.max(0, target - current);
}

/**
 * Computes countdown information for a window.
 * 
 * @param {object|null} window
 * @param {Date|string|number} [now=new Date()]
 * @returns {{
 *   status: string | null,
 *   secondsUntilStart: number,
 *   secondsUntilEnd: number,
 *   secondsLeft: number
 * }}
 */
export function countdownInfo(window, now = new Date()) {
  const status = effectiveWindowStatus(window, now);
  if (!window || !status) {
    return {
      status: null,
      secondsUntilStart: 0,
      secondsUntilEnd: 0,
      secondsLeft: 0,
    };
  }

  const msStart = msUntil(window.startsAt, now);
  const msEnd = msUntil(window.endsAt, now);

  let secondsLeft = 0;
  if (status === "open") {
    secondsLeft = Math.floor(msEnd / 1000);
  } else if (status === "scheduled") {
    secondsLeft = Math.floor(msStart / 1000);
  }

  return {
    status,
    secondsUntilStart: Math.floor(msStart / 1000),
    secondsUntilEnd: Math.floor(msEnd / 1000),
    secondsLeft,
  };
}

