import mongoose from "mongoose";
import { JOIN_REQUEST_STATUSES, JOIN_REQUEST_MESSAGE_MAX } from "../config/groups.js";

/**
 * GroupJoinRequest Model
 * 
 * Tracks join requests sent by prospective students to browseable forming roommate groups.
 * 
 * PRIVACY RULES:
 * - Stores ONLY compatibility score snapshots (aggregate and pairwise numbers).
 * - NEVER stores raw answers, deal-breakers, contact info, or demographic data.
 */
const GroupJoinRequestSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoommateGroup",
      required: [true, "Group reference is required"],
      index: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requester reference is required"],
      index: true,
    },
    message: {
      type: String,
      maxlength: [JOIN_REQUEST_MESSAGE_MAX, `Message cannot exceed ${JOIN_REQUEST_MESSAGE_MAX} characters`],
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: JOIN_REQUEST_STATUSES,
        message: "{VALUE} is not a valid join request status",
      },
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    closeReason: {
      type: String,
      default: null,
    },
    scoreSnapshot: {
      average: { type: Number, default: 0 },
      lowest: { type: Number, default: 0 },
      perMember: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          score: { type: Number, default: 0 },
        },
      ],
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

// Partial unique index: At most one pending request per (group, requester)
GroupJoinRequestSchema.index(
  { group: 1, requester: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

// High performance listing & cooldown lookup indexes
GroupJoinRequestSchema.index({ requester: 1, status: 1, createdAt: -1 });
GroupJoinRequestSchema.index({ group: 1, status: 1, createdAt: -1 });
GroupJoinRequestSchema.index({ requester: 1, group: 1, status: 1, respondedAt: -1 });

const GroupJoinRequest =
  mongoose.models.GroupJoinRequest ||
  mongoose.model("GroupJoinRequest", GroupJoinRequestSchema);

export default GroupJoinRequest;

