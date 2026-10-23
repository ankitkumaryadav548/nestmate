import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ["student", "admin"],
        message: "{VALUE} is not a supported user role",
      },
      default: "student",
      index: true,
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: "{VALUE} is not a supported gender option",
      },
      required: function () {
        return this.role === "student";
      },
    },
    registrationNumber: {
      type: String,
      trim: true,
      sparse: true, // Sparse index allows null/undefined for admins while enforcing uniqueness for students
      unique: true,
      required: function () {
        return this.role === "student";
      },
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    course: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    year: {
      type: Number,
      min: [1, "Academic year must be at least 1"],
      max: [6, "Academic year cannot exceed 6"],
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for query optimization
UserSchema.index({ email: 1 });
UserSchema.index({ registrationNumber: 1 }, { sparse: true, unique: true });
UserSchema.index({ role: 1, isActive: 1 });

// Prevent model recompilation error during Next.js hot-reload
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
