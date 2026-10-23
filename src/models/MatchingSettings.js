import mongoose from "mongoose";
import { DEFAULT_WEIGHTS, YEAR_BONUS } from "../config/matching.js";

/**
 * MatchingSettings Model
 * 
 * Stores system-wide configuration for the Roommate Matching Algorithm.
 * Implemented as a single-configuration document managed by campus administrators.
 */
const MatchingSettingsSchema = new mongoose.Schema(
  {
    weights: {
      sleepSchedule: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_WEIGHTS.sleepSchedule,
      },
      studyTime: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_WEIGHTS.studyTime,
      },
      cleanliness: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_WEIGHTS.cleanliness,
      },
      noiseTolerance: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_WEIGHTS.noiseTolerance,
      },
      foodType: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_WEIGHTS.foodType,
      },
      socialLevel: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_WEIGHTS.socialLevel,
      },
      languageAndCalls: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: DEFAULT_WEIGHTS.languageAndCalls,
      },
    },
    yearBonus: {
      sameYear: {
        type: Number,
        required: true,
        min: 0,
        max: 50,
        default: YEAR_BONUS.sameYear,
      },
      oneYearApart: {
        type: Number,
        required: true,
        min: 0,
        max: 50,
        default: YEAR_BONUS.oneYearApart,
      },
      otherwise: {
        type: Number,
        required: true,
        min: 0,
        max: 50,
        default: YEAR_BONUS.otherwise,
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

// Prevent Next.js hot-reload model re-compilation error
const MatchingSettings =
  mongoose.models.MatchingSettings ||
  mongoose.model("MatchingSettings", MatchingSettingsSchema);

export default MatchingSettings;
