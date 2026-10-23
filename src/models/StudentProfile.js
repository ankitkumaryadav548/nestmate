import mongoose from "mongoose";

/**
 * StudentProfile Model
 * 
 * Stores supplemental academic and demographic details for hostel allocation.
 * Cultural and regional fields exist solely to facilitate comfortable room sharing
 * and are never used to rank, penalize, or discriminate.
 */
const StudentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true,
      index: true,
    },
    homeState: {
      type: String,
      trim: true,
      default: "",
    },
    homeCountry: {
      type: String,
      trim: true,
      default: "India",
    },
    isInternational: {
      type: Boolean,
      default: false,
      index: true,
    },
    homeTimeZone: {
      type: String,
      trim: true,
      default: "Asia/Kolkata",
    },
    arrivalDate: {
      type: Date,
      default: null,
    },
    emergencyContactName: {
      type: String,
      trim: true,
      default: "",
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      default: "",
    },
    profileCompletedAt: {
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

StudentProfileSchema.index({ user: 1 }, { unique: true });
StudentProfileSchema.index({ isInternational: 1 });

const StudentProfile =
  mongoose.models.StudentProfile ||
  mongoose.model("StudentProfile", StudentProfileSchema);

export default StudentProfile;
