import mongoose from "mongoose";
import { GROUP_SIZE_OPTIONS, GROUP_STATUSES } from "../config/groups.js";
import { AC_OPTIONS, FLOOR_OPTIONS } from "../config/roomPreferences.js";

/**
 * RoommateGroup Model
 * 
 * Represents a student-formed residential group targeting a 2, 3, or 4-bed room.
 * The group creator is designated as the initial leader.
 */
const RoommateGroupSchema = new mongoose.Schema(
  {
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Group leader is required"],
      index: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Group gender designation is required"],
      index: true,
    },
    targetSize: {
      type: Number,
      required: [true, "Target group size is required"],
      enum: {
        values: GROUP_SIZE_OPTIONS,
        message: "{VALUE} is not a valid room group size",
      },
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: GROUP_STATUSES,
      default: "forming",
      index: true,
    },
    averageScore: {
      type: Number,
      default: null,
    },
    lowestPairScore: {
      type: Number,
      default: null,
    },
    engineVersion: {
      type: String,
      default: "1.0",
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    disbandedAt: {
      type: Date,
      default: null,
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
    roomPreferences: {
      preferredHostels: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Hostel",
        },
      ],
      acType: {
        type: String,
        enum: AC_OPTIONS,
        default: "no-preference",
      },
      floorPreference: {
        type: String,
        enum: FLOOR_OPTIONS,
        default: "any",
      },
      updatedAt: {
        type: Date,
        default: null,
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    preferencesNeedReview: {
      type: Boolean,
      default: false,
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

// CONCURRENCY & INTEGRITY: Partial unique index guarantees a student can belong to
// at most ONE active group (forming, complete, or locked) across the entire system.
RoommateGroupSchema.index(
  { "members.user": 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["forming", "complete", "locked"] },
    },
  }
);

RoommateGroupSchema.index({ status: 1, gender: 1, targetSize: 1 });

const RoommateGroup =
  mongoose.models.RoommateGroup ||
  mongoose.model("RoommateGroup", RoommateGroupSchema);

export default RoommateGroup;
