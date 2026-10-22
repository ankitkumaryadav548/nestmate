import mongoose from "mongoose";

const HostelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hostel name is required"],
      trim: true,
      maxlength: [100, "Hostel name cannot exceed 100 characters"],
    },
    code: {
      type: String,
      required: [true, "Hostel code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [10, "Hostel code cannot exceed 10 characters"],
      index: true,
    },
    gender: {
      type: String,
      required: [true, "Hostel gender designation is required"],
      enum: {
        values: ["boys", "girls", "mixed"],
        message: "{VALUE} is not a valid gender designation",
      },
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    totalFloors: {
      type: Number,
      required: [true, "Total floors count is required"],
      min: [1, "Hostel must have at least 1 floor"],
    },
    allowedYears: {
      type: [Number],
      default: [], // Empty array means all years (1-6) allowed
      validate: {
        validator: function (years) {
          return years.every((y) => Number.isInteger(y) && y >= 1 && y <= 6);
        },
        message: "Allowed academic years must be integers between 1 and 6",
      },
    },
    facilities: {
      type: [String],
      default: [],
    },
    rules: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup & filtering
HostelSchema.index({ gender: 1, isActive: 1 });

const Hostel = mongoose.models.Hostel || mongoose.model("Hostel", HostelSchema);

export default Hostel;
