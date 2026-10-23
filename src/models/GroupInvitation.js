import mongoose from "mongoose";
import { INVITATION_STATUSES } from "../config/groups.js";

/**
 * GroupInvitation Model
 * 
 * Tracks invitations sent by group leaders to prospective roommates.
 */
const GroupInvitationSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoommateGroup",
      required: [true, "Group reference is required"],
      index: true,
    },
    invitedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Invited student reference is required"],
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Inviting student reference is required"],
      index: true,
    },
    status: {
      type: String,
      enum: INVITATION_STATUSES,
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    scoreSnapshot: {
      average: { type: Number, default: 0 },
      lowest: { type: Number, default: 0 },
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

// Prevent duplicate active invitations to the same student from the same group
GroupInvitationSchema.index(
  { group: 1, invitedUser: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

GroupInvitationSchema.index({ invitedUser: 1, status: 1 });
GroupInvitationSchema.index({ invitedBy: 1, createdAt: 1 });

const GroupInvitation =
  mongoose.models.GroupInvitation ||
  mongoose.model("GroupInvitation", GroupInvitationSchema);

export default GroupInvitation;
