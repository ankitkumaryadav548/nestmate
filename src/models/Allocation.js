import mongoose from "mongoose";
import { ALLOCATION_STATUSES } from "../config/allocation.js";
import { ROOM_SOURCES } from "../config/selection.js";

/**
 * Allocation Model (Official Published Assignments & Live Selections)
 * 
 * The single source of truth for student room residency and the "My Room" portal.
 * Represents an officially finalized assignment of a student to a physical room.
 * 
 * Database Invariants:
 * - Partial unique index on { student: 1 } where status === "active" guarantees
 *   that a student can NEVER have more than one active allocation simultaneously.
 * - Compound index on { room: 1, status: 1 } optimizes room occupancy tracking.
 */
const AllocationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoommateGroup",
      default: null, // optional for 1-seater single-room students
    },
    run: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AllocationRun",
      default: null, // optional for selection and auto-fill
    },
    source: {
      type: String,
      enum: Object.values(ROOM_SOURCES),
      default: ROOM_SOURCES.ALLOCATION_RUN,
      index: true,
    },
    bedNumber: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ALLOCATION_STATUSES,
      default: "active",
      index: true,
    },
    allocatedAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce single active allocation per student at database engine level
AllocationSchema.index(
  { student: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
  }
);

// Compound index for room occupancy queries
AllocationSchema.index({ room: 1, status: 1 });

// Partial unique index to ensure two active members of one room never share a bed
AllocationSchema.index(
  { room: 1, bedNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active", bedNumber: { $type: "number" } },
  }
);

export default mongoose.models.Allocation || mongoose.model("Allocation", AllocationSchema);
