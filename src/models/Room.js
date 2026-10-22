import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema(
  {
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: [true, "Hostel reference is required"],
      index: true,
    },
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      trim: true,
    },
    floor: {
      type: Number,
      required: [true, "Floor number is required"],
      min: [0, "Floor number must be 0 (Ground) or higher"],
    },
    capacity: {
      type: Number,
      required: [true, "Room capacity is required"],
      min: [1, "Capacity must be at least 1"],
      max: [6, "Maximum room capacity is 6"],
    },
    roomType: {
      type: String,
      required: [true, "Room type is required"],
      enum: {
        values: ["AC", "Non-AC"],
        message: "{VALUE} is not a valid room type (AC or Non-AC)",
      },
      index: true,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: [0, "Current occupancy cannot be negative"],
      validate: {
        validator: function (val) {
          // In document validation, check against capacity
          return val <= (this.capacity || 6);
        },
        message: "Current occupancy ({VALUE}) cannot exceed room capacity",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["available", "full", "maintenance"],
        message: "{VALUE} is not a valid room status",
      },
      default: "available",
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: auto-calculate status based on capacity & occupancy
RoomSchema.pre("save", function (next) {
  if (this.status !== "maintenance") {
    if (this.currentOccupancy >= this.capacity) {
      this.status = "full";
    } else {
      this.status = "available";
    }
  }
  next();
});

// Helper for query updates or manual checks
export function computeRoomStatus(capacity, occupancy, currentStatus) {
  if (currentStatus === "maintenance") return "maintenance";
  return occupancy >= capacity ? "full" : "available";
}

// Unique compound index: roomNumber must be unique within a hostel
RoomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });
RoomSchema.index({ hostel: 1, floor: 1 });
RoomSchema.index({ hostel: 1, status: 1 });
RoomSchema.index({ hostel: 1, roomType: 1 });

const Room = mongoose.models.Room || mongoose.model("Room", RoomSchema);

export default Room;
