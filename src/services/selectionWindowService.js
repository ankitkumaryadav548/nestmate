import connectDB from "../lib/db.js";
import SelectionWindow from "../models/SelectionWindow.js";
import User from "../models/User.js";
import {
  effectiveWindowStatus,
  validateWindowInput,
  countdownInfo,
} from "./selection/windowStatus.js";
import { notifyMany } from "./notificationService.js";

/**
 * Helper to enrich window with computed effective status and countdown info.
 */
function enrichWindow(windowDoc, now = new Date()) {
  if (!windowDoc) return null;
  const raw = windowDoc.toObject ? windowDoc.toObject() : windowDoc;
  const status = effectiveWindowStatus(raw, now);
  const countdown = countdownInfo(raw, now);

  return {
    ...raw,
    id: raw._id.toString(),
    status,
    countdown,
  };
}

/**
 * Ensures all active students receive an opening notification exactly once.
 * 
 * Lazy Trigger Mechanism:
 * This helper is invoked when a window becomes open (createWindow with past/now start,
 * openNow, extend), or lazily whenever the window state is read by clients or admins
 * (getCurrentWindow, GET /api/selection/state, GET /api/selection/rooms, GET /api/admin/selection).
 * When a scheduled window's start time arrives, the next request that accesses the window detects
 * that the effective status is "open" and triggers notifications without requiring any cron job.
 * An atomic conditional update ({ _id: window._id, openNotifiedAt: null }) ensures idempotency
 * and eliminates race conditions. A standing background cron job is planned for future scope.
 * 
 * @param {object} windowDocOrObject
 * @returns {Promise<void>}
 */
export async function ensureOpenNotification(windowDocOrObject) {
  if (!windowDocOrObject) return;
  const raw = windowDocOrObject.toObject ? windowDocOrObject.toObject() : windowDocOrObject;
  const status = effectiveWindowStatus(raw);

  // If not open or already notified, do nothing
  if (status !== "open" || raw.openNotifiedAt) {
    return;
  }

  try {
    await connectDB();

    // Atomic conditional update: only update if openNotifiedAt is still null
    const now = new Date();
    const updatedDoc = await SelectionWindow.findOneAndUpdate(
      { _id: raw._id, openNotifiedAt: null },
      { $set: { openNotifiedAt: now } },
      { returnDocument: "after" }
    );

    // If update returned null, another concurrent request already claimed the notification
    if (!updatedDoc) {
      return;
    }

    if (windowDocOrObject.openNotifiedAt === null || windowDocOrObject.openNotifiedAt === undefined) {
      windowDocOrObject.openNotifiedAt = now;
    }

    // Query all active students
    const activeStudents = await User.find({ role: "student", isActive: true })
      .select("_id")
      .lean();

    const studentIds = activeStudents.map((s) => s._id.toString());
    if (studentIds.length === 0) return;

    const closingStr = raw.endsAt ? new Date(raw.endsAt).toLocaleString() : "";

    // Best-effort notification delivery: errors are logged and never break the request
    await notifyMany(
      studentIds,
      "room_selection_open",
      {
        windowName: raw.name || "Room Selection",
        endsAt: raw.endsAt,
        closingAt: closingStr,
      },
      {
        dedupeKey: `room_selection_open_${raw._id.toString()}`,
      }
    );
  } catch (err) {
    console.error("[SelectionWindowService] ensureOpenNotification error:", err);
  }
}

/**
 * Retrieves the currently active selection window.
 * Returns null if no live window exists.
 */
export async function getCurrentWindow() {
  await connectDB();
  const windowDoc = await SelectionWindow.findOne({ isActive: true });
  if (!windowDoc) return null;

  // Lazy trigger: if window has transitioned to open and wasn't notified yet, notify now
  // Real background cron job is future scope.
  if (effectiveWindowStatus(windowDoc) === "open" && !windowDoc.openNotifiedAt) {
    await ensureOpenNotification(windowDoc);
  }

  return enrichWindow(windowDoc);
}

/**
 * Creates a new selection window.
 * Only one live (isActive: true) window is allowed system-wide.
 */
export async function createWindow(adminId, { name, startsAt, endsAt }) {
  await connectDB();

  // 1. Refuse if an active window already exists
  const existing = await SelectionWindow.findOne({ isActive: true });
  if (existing) {
    const error = new Error("An active selection window already exists. Please close or finalize it first.");
    error.statusCode = 409;
    error.code = "WINDOW_EXISTS";
    throw error;
  }

  // 2. Validate inputs
  const validation = validateWindowInput({ startsAt, endsAt });
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }

  const windowDoc = new SelectionWindow({
    name: (name || "").trim() || "General Student Room Selection Window",
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    createdBy: adminId,
    isActive: true,
    openNotifiedAt: null,
  });

  await windowDoc.save();

  // If the window is immediately open (e.g. startsAt <= now), notify active students once
  if (effectiveWindowStatus(windowDoc) === "open") {
    await ensureOpenNotification(windowDoc);
  }

  return enrichWindow(windowDoc);
}

/**
 * Opens a scheduled window immediately by setting startsAt to now.
 */
export async function openNow(adminId, minutes = 60) {
  await connectDB();
  let windowDoc = await SelectionWindow.findOne({ isActive: true });
  if (!windowDoc) {
    const now = new Date();
    const endsAt = new Date(now.getTime() + (Number(minutes) || 60) * 60 * 1000);
    windowDoc = await SelectionWindow.create({
      academicYear: "2026-2027",
      semester: 1,
      name: "FCFS Selection Window",
      startsAt: now,
      endsAt,
      isActive: true,
      openNotifiedAt: null,
      createdBy: adminId,
      updatedBy: adminId,
    });
  } else {
    const now = new Date();
    windowDoc.startsAt = now;
    if (new Date(windowDoc.endsAt) <= now) {
      windowDoc.endsAt = new Date(now.getTime() + (Number(minutes) || 60) * 60 * 1000);
    }
    windowDoc.closedAt = null;
    windowDoc.finalizedAt = null;
    windowDoc.updatedBy = adminId;
    await windowDoc.save();
  }

  // Notify active students
  await ensureOpenNotification(windowDoc);

  return enrichWindow(windowDoc);
}

/**
 * Closes an open window immediately by setting closedAt to now.
 */
export async function closeNow(adminId) {
  await connectDB();
  const windowDoc = await SelectionWindow.findOne({ isActive: true });
  if (!windowDoc) {
    const error = new Error("No active selection window found");
    error.statusCode = 404;
    throw error;
  }

  const currentStatus = effectiveWindowStatus(windowDoc);
  if (currentStatus !== "open") {
    const error = new Error(`Cannot close window with status '${currentStatus}'. It must be 'open'.`);
    error.statusCode = 400;
    throw error;
  }

  windowDoc.closedAt = new Date();
  windowDoc.updatedBy = adminId;
  await windowDoc.save();

  return enrichWindow(windowDoc);
}

/**
 * Extends the window's end date-time.
 * Allowed when scheduled, open, or closed (clears closedAt).
 * Accepts either a number of minutes or a target Date / ISO string.
 */
export async function extendWindow(adminId, newEndsAtOrMinutes) {
  await connectDB();
  const windowDoc = await SelectionWindow.findOne({ isActive: true });
  if (!windowDoc) {
    const error = new Error("No active selection window found");
    error.statusCode = 404;
    throw error;
  }

  const currentStatus = effectiveWindowStatus(windowDoc);
  if (currentStatus === "finalized") {
    const error = new Error("Cannot extend a finalized selection window.");
    error.statusCode = 400;
    throw error;
  }

  let newEnd;
  const numMinutes = Number(newEndsAtOrMinutes);
  if (
    !isNaN(numMinutes) &&
    numMinutes > 0 &&
    numMinutes < 100000 &&
    typeof newEndsAtOrMinutes !== "object" &&
    !(typeof newEndsAtOrMinutes === "string" && newEndsAtOrMinutes.includes("-"))
  ) {
    const baseTime = Math.max(Date.now(), new Date(windowDoc.endsAt).getTime());
    newEnd = new Date(baseTime + numMinutes * 60 * 1000);
  } else {
    newEnd = new Date(newEndsAtOrMinutes);
  }

  if (isNaN(newEnd.getTime()) || newEnd.getTime() <= Date.now()) {
    const error = new Error("End must be in the future");
    error.statusCode = 400;
    throw error;
  }

  if (newEnd.getTime() <= new Date(windowDoc.endsAt).getTime()) {
    const error = new Error("New end time must be later than the current window end time");
    error.statusCode = 400;
    throw error;
  }

  windowDoc.endsAt = newEnd;
  windowDoc.closedAt = null; // Re-opens if it was closed
  windowDoc.updatedBy = adminId;
  await windowDoc.save();

  // If re-opened by extending, do NOT notify again if already notified (openNotifiedAt checked inside ensureOpenNotification)
  if (effectiveWindowStatus(windowDoc) === "open" && !windowDoc.openNotifiedAt) {
    await ensureOpenNotification(windowDoc);
  }

  return enrichWindow(windowDoc);
}

/**
 * Edits a window's name, startsAt, or endsAt while in "scheduled" status.
 * If the admin edits the start time of a window that has already notified, do not send again.
 */
export async function editWindow(adminId, { name, startsAt, endsAt }) {
  await connectDB();
  const windowDoc = await SelectionWindow.findOne({ isActive: true });
  if (!windowDoc) {
    const error = new Error("No active selection window found");
    error.statusCode = 404;
    throw error;
  }

  const currentStatus = effectiveWindowStatus(windowDoc);
  if (currentStatus !== "scheduled") {
    const error = new Error("Window can only be edited while in 'scheduled' status.");
    error.statusCode = 400;
    throw error;
  }

  const validation = validateWindowInput({ startsAt, endsAt });
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }

  if (name && name.trim()) windowDoc.name = name.trim();
  windowDoc.startsAt = new Date(startsAt);
  windowDoc.endsAt = new Date(endsAt);
  windowDoc.updatedBy = adminId;
  // Preserves existing openNotifiedAt; does not reset or re-send notification
  await windowDoc.save();

  // If new start time is now or in the past, it transitions to open: notify active students once if not previously notified
  if (effectiveWindowStatus(windowDoc) === "open" && !windowDoc.openNotifiedAt) {
    await ensureOpenNotification(windowDoc);
  }

  return enrichWindow(windowDoc);
}
