import mongoose from "mongoose";
import connectDB from "../lib/db.js";
import User from "../models/User.js";
import Hostel from "../models/Hostel.js";
import Allocation from "../models/Allocation.js";
import RoommateGroup from "../models/RoommateGroup.js";
import Notification from "../models/Notification.js";
import Announcement from "../models/Announcement.js";
import {
  FANOUT_CHUNK_SIZE,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  ANNOUNCEMENT_MAX_RECIPIENTS,
  getTypesForCategory,
} from "../config/notifications.js";
import { buildNotification } from "./notifications/templates.js";
import { buildDedupeKey } from "./notifications/dedupe.js";
import { validateAudience, describeAudience } from "./notifications/audience.js";
import { sanitizeLink } from "./notifications/linkValidator.js";

/**
 * Creates an in-app notification for a specific user.
 * 
 * Invariants & Best-Effort Guarantee:
 * - Never throws: wrapped in try/catch to never fail the caller's main database transaction.
 * - Idempotency: duplicate-key errors on partial unique index (user, dedupeKey) are swallowed.
 * - Skips inactive or non-existent users.
 * 
 * @param {string|mongoose.Types.ObjectId} userId 
 * @param {string} type 
 * @param {object} [params={}] 
 * @param {object} [options={}] 
 * @returns {Promise<object|null>}
 */
export async function notify(userId, type, params = {}, options = {}) {
  try {
    if (!userId) return null;
    await connectDB();

    // Verify recipient user is active
    const recipient = await User.findOne({ _id: userId, isActive: true }).select("_id").lean();
    if (!recipient) {
      return null;
    }

    const payload = buildNotification(type, params);

    const dedupeKey = options.dedupeParts
      ? buildDedupeKey(type, options.dedupeParts)
      : options.dedupeKey || null;

    const notif = await Notification.create({
      user: recipient._id,
      type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      severity: payload.severity,
      data: options.data && typeof options.data === "object" ? options.data : {},
      dedupeKey,
    });

    return notif;
  } catch (err) {
    // Duplicate dedupeKey (Mongo error 11000) is intended idempotency behaviour
    if (err.code === 11000) {
      return null;
    }
    console.error(`[Notification Service] Failed to notify user "${userId}" for event "${type}":`, err.message);
    return null;
  }
}

/**
 * Bulk-dispatches a notification to multiple user IDs in chunks of FANOUT_CHUNK_SIZE.
 * 
 * Best-effort and completely safe to call with empty array.
 * 
 * @param {Array<string|mongoose.Types.ObjectId>} userIds 
 * @param {string} type 
 * @param {object} [params={}] 
 * @param {object} [options={}] 
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function notifyMany(userIds, type, params = {}, options = {}) {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { created: 0, skipped: 0 };
    }

    await connectDB();

    const uniqueIdStrs = Array.from(
      new Set(
        userIds
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id.toString()))
          .map((id) => id.toString())
      )
    );

    if (uniqueIdStrs.length === 0) {
      return { created: 0, skipped: 0 };
    }

    // Verify active students
    const activeUsers = await User.find({
      _id: { $in: uniqueIdStrs },
      isActive: true,
    })
      .select("_id")
      .lean();

    if (activeUsers.length === 0) {
      return { created: 0, skipped: uniqueIdStrs.length };
    }

    const payload = buildNotification(type, params);
    const baseDedupe = options.dedupeParts ? buildDedupeKey(type, options.dedupeParts) : null;
    const extraData = options.data && typeof options.data === "object" ? options.data : {};

    let totalCreated = 0;
    let totalSkipped = uniqueIdStrs.length - activeUsers.length;

    // Process in chunks of FANOUT_CHUNK_SIZE
    for (let i = 0; i < activeUsers.length; i += FANOUT_CHUNK_SIZE) {
      const chunk = activeUsers.slice(i, i + FANOUT_CHUNK_SIZE);

      const docs = chunk.map((u) => ({
        user: u._id,
        type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        severity: payload.severity,
        data: extraData,
        dedupeKey: baseDedupe ? `${baseDedupe}:${u._id.toString()}` : null,
      }));

      try {
        const insertRes = await Notification.insertMany(docs, { ordered: false });
        totalCreated += insertRes.length;
      } catch (insertErr) {
        // Tolerates partial duplicate-key errors under { ordered: false }
        if (insertErr.insertedDocs) {
          totalCreated += insertErr.insertedDocs.length;
          totalSkipped += docs.length - insertErr.insertedDocs.length;
        } else {
          console.error("[Notification Service] Bulk chunk insertion error:", insertErr.message);
          totalSkipped += docs.length;
        }
      }
    }

    return { created: totalCreated, skipped: totalSkipped };
  } catch (err) {
    console.error(`[Notification Service] notifyMany error for type "${type}":`, err.message);
    return { created: 0, skipped: userIds ? userIds.length : 0 };
  }
}

/**
 * Lists paginated notifications for the authenticated session user.
 * 
 * @param {string|mongoose.Types.ObjectId} userId 
 * @param {object} [options={}]
 * @returns {Promise<object>}
 */
export async function listMyNotifications(userId, options = {}) {
  await connectDB();

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(options.limit) || PAGE_SIZE_DEFAULT));
  const skip = (page - 1) * limit;

  const filter = { user: userId };

  if (options.unreadOnly === true || options.unreadOnly === "true") {
    filter.readAt = null;
  }

  if (options.category && options.category !== "all") {
    const types = getTypesForCategory(options.category);
    filter.type = { $in: types };
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Returns single indexed unread count for session user.
 * 
 * @param {string|mongoose.Types.ObjectId} userId 
 * @returns {Promise<number>}
 */
export async function getUnreadCount(userId) {
  await connectDB();
  return Notification.countDocuments({ user: userId, readAt: null });
}

/**
 * Marks a single notification as read if it belongs to the authenticated user.
 * Returns null if not found or unauthorized.
 * 
 * @param {string|mongoose.Types.ObjectId} userId 
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function markRead(userId, id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id.toString())) {
    return null;
  }

  await connectDB();

  const notif = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" }
  ).lean();

  return notif;
}

/**
 * Marks all notifications (or all in a category) as read for session user.
 * 
 * @param {string|mongoose.Types.ObjectId} userId 
 * @param {string|null} [category=null] 
 * @returns {Promise<{ modifiedCount: number }>}
 */
export async function markAllRead(userId, category = null) {
  await connectDB();

  const filter = { user: userId, readAt: null };
  if (category && category !== "all") {
    filter.type = { $in: getTypesForCategory(category) };
  }

  const result = await Notification.updateMany(filter, {
    $set: { readAt: new Date() },
  });

  return { modifiedCount: result.modifiedCount };
}

/**
 * Deletes a notification belonging to the session user.
 * Returns null if not found or unauthorized.
 * 
 * @param {string|mongoose.Types.ObjectId} userId 
 * @param {string} id 
 * @returns {Promise<boolean>}
 */
export async function deleteMine(userId, id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id.toString())) {
    return false;
  }

  await connectDB();
  const deleted = await Notification.findOneAndDelete({ _id: id, user: userId });
  return !!deleted;
}

/**
 * Deletes all read notifications belonging to the session user.
 * 
 * @param {string|mongoose.Types.ObjectId} userId 
 * @returns {Promise<{ deletedCount: number }>}
 */
export async function deleteAllRead(userId) {
  await connectDB();
  const result = await Notification.deleteMany({
    user: userId,
    readAt: { $ne: null },
  });
  return { deletedCount: result.deletedCount };
}

/**
 * Resolves audience filter into an array of active student user IDs without N+1 queries.
 * 
 * @param {object} rawAudience 
 * @returns {Promise<string[]>}
 */
export async function resolveAudience(rawAudience) {
  await connectDB();
  const audience = validateAudience(rawAudience);

  let userIds = [];

  switch (audience.type) {
    case "all_students": {
      const users = await User.find({ role: "student", isActive: true })
        .select("_id")
        .lean();
      userIds = users.map((u) => u._id.toString());
      break;
    }

    case "gender": {
      const users = await User.find({
        role: "student",
        isActive: true,
        gender: audience.gender,
      })
        .select("_id")
        .lean();
      userIds = users.map((u) => u._id.toString());
      break;
    }

    case "year": {
      const users = await User.find({
        role: "student",
        isActive: true,
        year: audience.year,
      })
        .select("_id")
        .lean();
      userIds = users.map((u) => u._id.toString());
      break;
    }

    case "hostel": {
      const allocs = await Allocation.find({
        hostel: audience.hostelId,
        status: "active",
      })
        .select("student")
        .lean();

      const allocatedStudentIds = allocs.map((a) => a.student);
      const users = await User.find({
        _id: { $in: allocatedStudentIds },
        role: "student",
        isActive: true,
      })
        .select("_id")
        .lean();
      userIds = users.map((u) => u._id.toString());
      break;
    }

    case "allocated": {
      const allocs = await Allocation.find({ status: "active" })
        .select("student")
        .lean();
      const allocatedStudentIds = allocs.map((a) => a.student);
      const users = await User.find({
        _id: { $in: allocatedStudentIds },
        role: "student",
        isActive: true,
      })
        .select("_id")
        .lean();
      userIds = users.map((u) => u._id.toString());
      break;
    }

    case "not_allocated": {
      const allocs = await Allocation.find({ status: "active" })
        .select("student")
        .lean();
      const allocatedStudentIds = allocs.map((a) => a.student);
      const users = await User.find({
        _id: { $nin: allocatedStudentIds },
        role: "student",
        isActive: true,
      })
        .select("_id")
        .lean();
      userIds = users.map((u) => u._id.toString());
      break;
    }

    case "group_status": {
      if (audience.status === "none") {
        const activeGroups = await RoommateGroup.find({
          status: { $in: ["forming", "complete", "locked"] },
        })
          .select("members.user")
          .lean();

        const inGroupStudentIds = activeGroups.flatMap((g) =>
          g.members.map((m) => m.user)
        );

        const users = await User.find({
          _id: { $nin: inGroupStudentIds },
          role: "student",
          isActive: true,
        })
          .select("_id")
          .lean();
        userIds = users.map((u) => u._id.toString());
      } else {
        const groups = await RoommateGroup.find({ status: audience.status })
          .select("members.user")
          .lean();

        const memberStudentIds = groups.flatMap((g) =>
          g.members.map((m) => m.user)
        );

        const users = await User.find({
          _id: { $in: memberStudentIds },
          role: "student",
          isActive: true,
        })
          .select("_id")
          .lean();
        userIds = users.map((u) => u._id.toString());
      }
      break;
    }

    default:
      userIds = [];
  }

  if (userIds.length > ANNOUNCEMENT_MAX_RECIPIENTS) {
    throw new Error(
      `Audience size (${userIds.length}) exceeds the maximum allowed recipients limit of ${ANNOUNCEMENT_MAX_RECIPIENTS}`
    );
  }

  return userIds;
}

/**
 * Dispatches an administrative announcement to a targeted cohort.
 * 
 * @param {string|mongoose.Types.ObjectId} adminId 
 * @param {{ title: string, message: string, link?: string, audience: object }} announcementData 
 * @returns {Promise<object>}
 */
export async function sendAnnouncement(adminId, { title, message, link, audience }) {
  await connectDB();

  if (!title || typeof title !== "string" || !title.trim()) {
    throw new Error("Announcement title is required");
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    throw new Error("Announcement message is required");
  }

  const safeLink = sanitizeLink(link, null);
  const normalizedAudience = validateAudience(audience);
  const userIds = await resolveAudience(normalizedAudience);

  // Lookup auxiliary metadata for descriptive label
  const lookups = {};
  if (normalizedAudience.type === "hostel") {
    const hostel = await Hostel.findById(normalizedAudience.hostelId).select("name").lean();
    if (hostel) lookups.hostelName = hostel.name;
  }

  const audienceLabel = describeAudience(normalizedAudience, lookups);

  const announcement = await Announcement.create({
    title: title.trim(),
    message: message.trim(),
    link: safeLink,
    audience: normalizedAudience,
    audienceLabel,
    recipientCount: userIds.length,
    createdBy: adminId,
    status: "sent",
  });

  // Fan out in-app notifications
  if (userIds.length > 0) {
    await notifyMany(
      userIds,
      "announcement",
      {
        title: announcement.title,
        message: announcement.message,
        link: safeLink,
      },
      {
        data: { announcementId: announcement._id.toString() },
        dedupeParts: [announcement._id.toString()],
      }
    );
  }

  return announcement;
}

/**
 * Lists announcements with pagination and aggregate read counts without N+1 queries.
 * 
 * @param {object} [options={}] 
 * @returns {Promise<object>}
 */
export async function listAnnouncements(options = {}) {
  await connectDB();

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(options.limit) || PAGE_SIZE_DEFAULT));
  const skip = (page - 1) * limit;

  const [announcements, total] = await Promise.all([
    Announcement.find({})
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Announcement.countDocuments({}),
  ]);

  const announcementIds = announcements.map((a) => a._id.toString());

  // Aggregate read counts in one single query
  const readAgg = await Notification.aggregate([
    {
      $match: {
        "data.announcementId": { $in: announcementIds },
        readAt: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$data.announcementId",
        readCount: { $sum: 1 },
      },
    },
  ]);

  const readCountMap = new Map();
  readAgg.forEach((r) => readCountMap.set(String(r._id), r.readCount));

  const items = announcements.map((a) => ({
    ...a,
    readCount: readCountMap.get(a._id.toString()) || 0,
  }));

  return {
    announcements: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Returns single announcement details with its live read count.
 * 
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function getAnnouncement(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id.toString())) {
    return null;
  }

  await connectDB();

  const announcement = await Announcement.findById(id)
    .populate("createdBy", "name email")
    .lean();

  if (!announcement) return null;

  const readCount = await Notification.countDocuments({
    "data.announcementId": id.toString(),
    readAt: { $ne: null },
  });

  return {
    ...announcement,
    readCount,
  };
}

/**
 * Withdraws an active announcement and purges all delivered in-app copies.
 * 
 * @param {string|mongoose.Types.ObjectId} adminId 
 * @param {string} id 
 * @returns {Promise<object>}
 */
export async function withdrawAnnouncement(adminId, id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id.toString())) {
    throw new Error("Invalid announcement ID");
  }

  await connectDB();

  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw new Error("Announcement not found");
  }

  announcement.status = "withdrawn";
  announcement.withdrawnAt = new Date();
  await announcement.save();

  // Purge all delivered copies for this announcement
  await Notification.deleteMany({
    "data.announcementId": id.toString(),
  });

  return announcement;
}

/**
 * Efficient helper to retrieve student display names in a single batch query.
 * 
 * @param {Array<string|mongoose.Types.ObjectId>} ids 
 * @returns {Promise<Map<string, string>>}
 */
export async function getUserDisplayNames(ids) {
  await connectDB();
  const users = await User.find({ _id: { $in: ids } })
    .select("_id name")
    .lean();

  const map = new Map();
  users.forEach((u) => map.set(u._id.toString(), u.name));
  return map;
}
