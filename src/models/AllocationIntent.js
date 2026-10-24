import mongoose from "mongoose";
import { GROUP_SIZE_OPTIONS } from "../config/groups.js";
import { AC_OPTIONS, FLOOR_OPTIONS } from "../config/roomPreferences.js";

/**
 * AllocationIntent Model
 * 
 * Records student preference regarding group formation vs. automatic system placement.
 * Students who opt for "auto" will be placed directly by the Phase 5 allocation engine.
 */
const AllocationIntentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["group", "auto"],
      default: "group",
      index: true,
    },
    preferredRoomSize: {
      type: Number,
      enum: GROUP_SIZE_OPTIONS,
      default: 2,
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
    allocatedAt: {
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

const AllocationIntent =
  mongoose.models.AllocationIntent ||
  mongoose.model("AllocationIntent", AllocationIntentSchema);

export default AllocationIntent;
