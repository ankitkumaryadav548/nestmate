import mongoose from "mongoose";
import { TITLE_MAX, MESSAGE_MAX } from "../config/notifications.js";

/**
 * Announcement Model
 * 
 * Tracks administrative broadcast messages dispatched to targeted student cohorts.
 */
const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      trim: true,
      maxlength: [TITLE_MAX, `Title cannot exceed ${TITLE_MAX} characters`],
    },
    message: {
      type: String,
      required: [true, "Announcement message is required"],
      trim: true,
      maxlength: [MESSAGE_MAX, `Message cannot exceed ${MESSAGE_MAX} characters`],
    },
    link: {
      type: String,
      default: null,
    },
    audience: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Target audience specification is required"],
    },
    audienceLabel: {
      type: String,
      required: [true, "Human-readable audience label is required"],
      trim: true,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creating administrator is required"],
    },
    status: {
      type: String,
      enum: ["sent", "withdrawn"],
      default: "sent",
      index: true,
    },
    withdrawnAt: {
      type: Date,
      default: null,
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

AnnouncementSchema.index({ createdAt: -1 });

const Announcement =
  mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);

export default Announcement;
