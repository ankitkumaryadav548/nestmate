/**
 * Seed Single Rooms (Capacity 1)
 *
 * NOTE: These are demo inventory and can be changed or customized anytime from the admin panel (/admin/rooms).
 *
 * For every ACTIVE hostel, adds 6 rooms with capacity 1:
 *   S01, S02, S03: AC, floor 0
 *   S04, S05, S06: Non-AC, floor 0
 *
 * Skips rooms that already exist (idempotent, safe to run multiple times).
 *
 * Usage:
 *   npm run seed:singlerooms
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Seed Single Rooms] Error: .env.local file not found.");
    process.exit(1);
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[Seed Single Rooms] Error: MONGODB_URI is missing in .env.local");
  process.exit(1);
}

const HostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    gender: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const RoomSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: "Hostel", required: true },
    roomNumber: { type: String, required: true },
    floor: { type: Number, required: true },
    capacity: { type: Number, required: true },
    roomType: { type: String, enum: ["AC", "Non-AC"], required: true },
    currentOccupancy: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance"],
      default: "available",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RoomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });

const Hostel = mongoose.models.Hostel || mongoose.model("Hostel", HostelSchema);
const Room = mongoose.models.Room || mongoose.model("Room", RoomSchema);

const SINGLE_ROOMS_CONFIG = [
  { roomNumber: "S01", roomType: "AC", floor: 0, capacity: 1 },
  { roomNumber: "S02", roomType: "AC", floor: 0, capacity: 1 },
  { roomNumber: "S03", roomType: "AC", floor: 0, capacity: 1 },
  { roomNumber: "S04", roomType: "Non-AC", floor: 0, capacity: 1 },
  { roomNumber: "S05", roomType: "Non-AC", floor: 0, capacity: 1 },
  { roomNumber: "S06", roomType: "Non-AC", floor: 0, capacity: 1 },
];

async function seedSingleRooms() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("[Seed Single Rooms] Connected to MongoDB Atlas.");

    const activeHostels = await Hostel.find({ isActive: true }).lean();
    console.log(`[Seed Single Rooms] Found ${activeHostels.length} active hostel(s).\n`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const hostel of activeHostels) {
      console.log(`Processing Hostel: ${hostel.name} (${hostel.code})`);
      for (const roomConfig of SINGLE_ROOMS_CONFIG) {
        const existing = await Room.findOne({
          hostel: hostel._id,
          roomNumber: roomConfig.roomNumber,
        }).lean();

        if (existing) {
          console.log(`  ⏭️  Room ${roomConfig.roomNumber} already exists — skipped.`);
          totalSkipped++;
        } else {
          await Room.create({
            hostel: hostel._id,
            roomNumber: roomConfig.roomNumber,
            floor: roomConfig.floor,
            capacity: roomConfig.capacity,
            roomType: roomConfig.roomType,
            currentOccupancy: 0,
            status: "available",
            isActive: true,
          });
          console.log(`  ✅ Created single room ${roomConfig.roomNumber} (capacity 1, ${roomConfig.roomType}, Floor ${roomConfig.floor})`);
          totalCreated++;
        }
      }
    }

    console.log("\n================ Single Rooms Seeding Summary ================");
    console.log(`Active hostels checked : ${activeHostels.length}`);
    console.log(`New single rooms created: ${totalCreated}`);
    console.log(`Existing rooms skipped : ${totalSkipped}`);
    console.log("==============================================================");
  } catch (err) {
    console.error("[Seed Single Rooms] Fatal error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("[Seed Single Rooms] Database connection closed.");
  }
}

seedSingleRooms();

