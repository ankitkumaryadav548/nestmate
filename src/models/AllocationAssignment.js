import mongoose from "mongoose";

/**
 * AllocationAssignment Model (Phase 5 - Simulation & Draft Mode)
 * 
 * Stores the placement outcome of a unit (assigned room or waitlisted with reason).
 * Belongs strictly to an AllocationRun.
 */
const AllocationAssignmentSchema = new mongoose.Schema(
  {
    run: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AllocationRun",
      required: true,
      index: true,
    },
    unitKind: {
      type: String,
      enum: ["group", "filled-group", "shrunk-group", "pool-group"],
      required: true,
    },
    sourceGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoommateGroup",
      default: null,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["assigned", "waitlisted"],
      required: true,
      index: true,
    },
    waitlistReason: {
      type: String,
      default: null,
    },
    size: {
      type: Number,
      required: true,
    },
    groupAverage: {
      type: Number,
      default: null,
    },
    groupLowest: {
      type: Number,
      default: null,
    },
    hostelRank: {
      type: Number,
      default: null,
    },
    acMatch: {
      type: Boolean,
      default: null,
    },
    floorMatch: {
      type: Boolean,
      default: null,
    },
    preferenceScore: {
      type: Number,
      default: 0,
    },
    round: {
      type: Number,
      default: null,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-performance administrative queries
AllocationAssignmentSchema.index({ run: 1, status: 1 });
AllocationAssignmentSchema.index({ run: 1, members: 1 });
AllocationAssignmentSchema.index({ run: 1, hostel: 1 });

export default mongoose.models.AllocationAssignment || mongoose.model("AllocationAssignment", AllocationAssignmentSchema);
