import mongoose from "mongoose";
import { RUN_STATUSES, ENGINE_VERSION } from "../config/allocation.js";

/**
 * AllocationRun Model (Phase 5 - Simulation & Draft Mode)
 * 
 * Represents an execution run of the automated allocation engine.
 * Stores run configuration options, snapshot of weights, summary metrics,
 * comparison against the random baseline, and timestamps.
 */
const AllocationRunSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: function () {
        return `Run ${new Date().toISOString().replace("T", " ").substring(0, 19)}`;
      },
    },
    status: {
      type: String,
      enum: RUN_STATUSES,
      default: "running",
      index: true,
    },
    options: {
      seed: { type: mongoose.Schema.Types.Mixed, default: null },
      priorityMode: { type: String, default: "lottery" },
      gender: { type: String, default: "all" },
      studentScope: { type: String, default: "all" },
      includeUngrouped: { type: Boolean, default: true },
      defaultRoomSize: { type: Number, default: 2 },
      incompleteGroupPolicy: { type: String, default: "shrink" },
      maxSwapPasses: { type: Number, default: 3 },
      baselineTrials: { type: Number, default: 20 },
    },
    weightsSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    engineVersion: {
      type: String,
      default: ENGINE_VERSION,
    },
    stats: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    unallocated: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        reason: {
          type: String,
          required: true,
        },
      },
    ],
    waitlistCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

AllocationRunSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.AllocationRun || mongoose.model("AllocationRun", AllocationRunSchema);
