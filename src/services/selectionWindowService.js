import connectDB from "../lib/db.js";
import SelectionWindow from "../models/SelectionWindow.js";
import Preference from "../models/Preference.js";
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
 * Retrieves the currently active selection window.
 * Returns null if no live window exists.
 */
export async function getCurrentWindow() {
  await connectDB();
  const windowDoc = await SelectionWindow.findOne({ isActive: true }).lean();
  if (!windowDoc) return null;
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
    name: name.trim(),
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    createdBy: adminId,
    isActive: true,
  });

  await windowDoc.save();
  const enriched = enrichWindow(windowDoc);

  // If the window is immediately open (e.g. startsAt <= now), notify active students once
  if (enriched.status === "open") {
    sendWindowOpenNotification(windowDoc).catch((err) =>
      console.error("[SelectionWindowService] Failed to send open notification:", err)
    );
  }

  // NOTE: If startsAt is in the future (status "scheduled"), automatic transition to "open"
  // without admin interaction would require a background cron/scheduler. For now, the admin
  // can click "Open now" when ready or an announcement can be published.

  return enriched;
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

  // Notify active students with completed preferences
  sendWindowOpenNotification(windowDoc).catch((err) =>
    console.error("[SelectionWindowService] Failed to send open notification:", err)
  );

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
 */
export async function extendWindow(adminId, newEndsAt) {
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

  const newEnd = new Date(newEndsAt);
  if (isNaN(newEnd.getTime()) || newEnd.getTime() <= Date.now()) {
    const error = new Error("New end time must be a valid future date");
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

  return enrichWindow(windowDoc);
}

/**
 * Edits a window's name, startsAt, or endsAt while in "scheduled" status.
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

  if (name) windowDoc.name = name.trim();
  windowDoc.startsAt = new Date(startsAt);
  windowDoc.endsAt = new Date(endsAt);
  windowDoc.updatedBy = adminId;
  await windowDoc.save();

  return enrichWindow(windowDoc);
}

/**
 * Best-effort helper to notify all active students with completed preferences.
 */
async function sendWindowOpenNotification(windowDoc) {
  try {
    const completedPrefs = await Preference.find({ completedAt: { $ne: null } })
      .select("student")
      .lean();
    const studentIds = completedPrefs.map((p) => p.student).filter(Boolean);

    if (studentIds.length > 0) {
      await notifyMany(
        studentIds,
        "room_selection_open",
        { windowName: windowDoc.name },
        { dedupeKey: `window_open_${windowDoc._id}` }
      );
    }
  } catch (err) {
    console.error("[SelectionWindowService] sendWindowOpenNotification error:", err);
  }
}

