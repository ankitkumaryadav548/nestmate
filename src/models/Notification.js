import mongoose from "mongoose";
import {
  NOTIFICATION_TYPE_KEYS,
  RETENTION_DAYS,
  TITLE_MAX,
  MESSAGE_MAX,
} from "../config/notifications.js";

/**
 * Notification Model
 * 
 * Stores in-app user notifications with TTL self-cleanup, deduplication,
 * and high-efficiency query indexing.
 */
const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient user is required"],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: NOTIFICATION_TYPE_KEYS,
        message: "{VALUE} is not a registered notification type",
      },
      required: [true, "Notification type is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [TITLE_MAX, `Title cannot exceed ${TITLE_MAX} characters`],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [MESSAGE_MAX, `Message cannot exceed ${MESSAGE_MAX} characters`],
    },
    link: {
      type: String,
      default: null,
    },
    severity: {
      type: String,
      enum: ["info", "success", "warning"],
      default: "info",
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dedupeKey: {
      type: String,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// High-performance index for user notification feed and unread counts
NotificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

// TTL index to automatically purge expired records
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Partial unique index guaranteeing idempotency: duplicate events never notify the same user twice
NotificationSchema.index(
  { user: 1, dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: "string" } },
  }
);

const Notification =
  mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

export default Notification;
