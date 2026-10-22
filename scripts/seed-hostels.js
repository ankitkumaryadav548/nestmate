/**
 * ==============================================================================
 * HostelMatch Demo Seed Script: Hostels & Rooms
 * ==============================================================================
 * NOTE: This is purely demonstration / boilerplate data. All hostel names, codes,
 * floors, facilities, and room configurations can be dynamically customized,
 * added, or deleted anytime from the Admin Management Console (/admin/hostels).
 *
 * Safe to execute multiple times (skips already existing hostel codes).
 * ==============================================================================
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Seed Hostels] Error: .env.local file not found.");
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
  console.error("[Seed Hostels] Error: MONGODB_URI is missing in .env.local");
  process.exit(1);
}

// Minimal schemas for the script
const HostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    gender: { type: String, enum: ["boys", "girls", "mixed"], required: true },
    location: { type: String, default: "" },
    totalFloors: { type: Number, required: true },
    allowedYears: { type: [Number], default: [] },
    facilities: { type: [String], default: [] },
    rules: { type: String, default: "" },
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
    status: { type: String, enum: ["available", "full", "maintenance"], default: "available" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

RoomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });

const Hostel = mongoose.models.Hostel || mongoose.model("Hostel", HostelSchema);
const Room = mongoose.models.Room || mongoose.model("Room", RoomSchema);

const SAMPLE_FACILITIES = [
  "High-Speed Wi-Fi",
  "Laundry Facilities",
  "Mess / Dining Hall",
  "Indoor Sports & Gym",
  "24x7 Water & Backup Power",
  "Study Room & Library",
];

// 10 Boys Hostels (BH1 - BH10)
const BOYS_HOSTELS = Array.from({ length: 10 }, (_, i) => {
  const num = i + 1;
  return {
    name: `Boys Hostel Block ${num}`,
    code: `BH${num}`,
    gender: "boys",
    location: `North Campus Sector ${num}`,
    totalFloors: 4,
    allowedYears: [], // Open to all years
    facilities: SAMPLE_FACILITIES,
    rules: "Curfew: 10:30 PM. Maintain silence in corridors after 11:00 PM.",
    isActive: true,
  };
});

// 7 Girls Hostels (GH1 - GH7)
const GIRLS_HOSTELS = Array.from({ length: 7 }, (_, i) => {
  const num = i + 1;
  return {
    name: `Girls Hostel Block ${num}`,
    code: `GH${num}`,
    gender: "girls",
    location: `South Campus Sector ${num}`,
    totalFloors: 4,
    allowedYears: [], // Open to all years
    facilities: SAMPLE_FACILITIES,
    rules: "Curfew: 10:00 PM. Visitors allowed in reception lounge only.",
    isActive: true,
  };
});

const ALL_HOSTELS = [...BOYS_HOSTELS, ...GIRLS_HOSTELS];

async function seedHostelsAndRooms() {
  console.log("[Seed Hostels] Connecting to MongoDB Atlas...");
  try {
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    console.log("[Seed Hostels] Successfully connected.");

    let totalHostelsCreated = 0;
    let totalHostelsSkipped = 0;
    let totalRoomsCreated = 0;

    for (const hData of ALL_HOSTELS) {
      const existing = await Hostel.findOne({ code: hData.code });
      if (existing) {
        console.log(`[Seed Hostels] Hostel "${hData.code}" already exists. Skipping.`);
        totalHostelsSkipped++;
        continue;
      }

      const hostel = await Hostel.create(hData);
      totalHostelsCreated++;
      console.log(`[Seed Hostels] Created hostel "${hostel.name}" (${hostel.code}).`);

      // Create 4 floors x 10 rooms per floor = 40 rooms
      const roomsBatch = [];
      for (let floor = 1; floor <= hostel.totalFloors; floor++) {
        for (let r = 1; r <= 10; r++) {
          const roomNumber = `${floor}${r < 10 ? "0" + r : r}`;
          
          // Mix capacities (2, 3, 4) and types (AC, Non-AC)
          let capacity;
          if (r % 3 === 0) capacity = 4;
          else if (r % 2 === 0) capacity = 3;
          else capacity = 2;

          const roomType = (floor + r) % 2 === 0 ? "AC" : "Non-AC";

          roomsBatch.push({
            hostel: hostel._id,
            roomNumber,
            floor,
            capacity,
            roomType,
            currentOccupancy: 0,
            status: "available",
            notes: "Demo room seeded for testing",
          });
        }
      }

      const inserted = await Room.insertMany(roomsBatch);
      totalRoomsCreated += inserted.length;
      console.log(`  └─ Added ${inserted.length} rooms to ${hostel.code}`);
    }

    console.log("\n========================================================");
    console.log("             HOSTEL SEED COMPLETED");
    console.log("========================================================");
    console.log(`Hostels Created : ${totalHostelsCreated}`);
    console.log(`Hostels Skipped : ${totalHostelsSkipped}`);
    console.log(`Rooms Created   : ${totalRoomsCreated}`);
    console.log("All sample data is ready and configurable via /admin/hostels.");
    console.log("========================================================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("[Seed Hostels Error]:", err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seedHostelsAndRooms();
