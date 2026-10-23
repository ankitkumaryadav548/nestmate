import mongoose from "mongoose";

/**
 * Preference Model
 * 
 * Stores student lifestyle answers and non-negotiable deal-breaker criteria.
 * PRIVACY GUARANTEE: These preferences are private and strictly confidential.
 * No student can view another student's preference records.
 * 
 * Inclusivity Notice: No substance questions (smoking/alcohol) are present.
 * Cultural comfort is strictly voluntary and low-weight; never used to rank or penalize.
 */
const PreferenceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
      unique: true,
      index: true,
    },
    // Daily routine
    sleepSchedule: {
      type: String,
      enum: {
        values: ["early", "normal", "late"],
        message: "{VALUE} is not a valid sleep schedule option",
      },
      default: null,
    },
    studyTime: {
      type: String,
      enum: {
        values: ["morning", "daytime", "night", "flexible"],
        message: "{VALUE} is not a valid study time option",
      },
      default: null,
    },
    nightCalls: {
      type: String,
      enum: {
        values: ["never", "sometimes", "often"],
        message: "{VALUE} is not a valid night calls option",
      },
      default: null,
    },

    // Living habits
    cleanliness: {
      type: Number,
      min: [1, "Cleanliness rating must be between 1 and 5"],
      max: [5, "Cleanliness rating must be between 1 and 5"],
      default: null,
    },
    noiseTolerance: {
      type: Number,
      min: [1, "Noise tolerance rating must be between 1 and 5"],
      max: [5, "Noise tolerance rating must be between 1 and 5"],
      default: null,
    },
    socialLevel: {
      type: Number,
      min: [1, "Social level rating must be between 1 and 5"],
      max: [5, "Social level rating must be between 1 and 5"],
      default: null,
    },
    acPreference: {
      type: String,
      enum: {
        values: ["ac", "non-ac", "no-preference"],
        message: "{VALUE} is not a valid AC preference option",
      },
      default: null,
    },

    // Food & languages
    foodType: {
      type: String,
      enum: {
        values: ["veg", "non-veg", "eggetarian", "halal", "jain"],
        message: "{VALUE} is not a valid dietary option",
      },
      default: null,
    },
    okWithDifferentFood: {
      type: Boolean,
      default: null,
    },
    languages: {
      type: [String],
      default: [],
    },
    culturalComfort: {
      type: String,
      enum: {
        values: ["open-to-all", "prefer-similar-background", "no-preference"],
        message: "{VALUE} is not a valid cultural comfort option",
      },
      default: "no-preference",
    },

    // Deal breakers: strict constraints interpreted by the roommate matching engine
    dealBreakers: {
      type: [
        {
          type: String,
          enum: ["food", "lateNightNoise", "visitors", "cleanliness", "acType"],
        },
      ],
      default: [],
    },

    completedAt: {
      type: Date,
      default: null,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
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

PreferenceSchema.index({ student: 1 }, { unique: true });
PreferenceSchema.index({ completedAt: 1 });

const Preference =
  mongoose.models.Preference ||
  mongoose.model("Preference", PreferenceSchema);

export default Preference;
