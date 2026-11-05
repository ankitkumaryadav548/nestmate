import mongoose from "mongoose";

const SelectionWindowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Window name is required"],
      trim: true,
    },
    startsAt: {
      type: Date,
      required: [true, "Window start date-time is required"],
    },
    endsAt: {
      type: Date,
      required: [true, "Window end date-time is required"],
    },
    closedAt: {
      type: Date,
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    finalizeSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// CONCURRENCY & INTEGRITY: Only ONE live active selection window may exist across the system.
SelectionWindowSchema.index(
  { isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  }
);

const SelectionWindow =
  mongoose.models.SelectionWindow ||
  mongoose.model("SelectionWindow", SelectionWindowSchema);

export default SelectionWindow;

