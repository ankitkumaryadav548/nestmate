/**
 * ==============================================================================
 * HostelMatch Demo Seed Script: Seed Room Preferences (Phase 4 Part 2)
 * ==============================================================================
 * Fills realistic room preferences (eligible hostels, AC, and floor bands)
 * for existing demo groups and demo auto-assign pool students.
 * 
 * Safe to execute multiple times. Operates ONLY on demo data (isDemo: true).
 * Real students and admin configurations are never touched.
 * ==============================================================================
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Seed Room Preferences] Error: .env.local file not found.");
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
  console.error("[Seed Room Preferences] Error: MONGODB_URI is missing in .env.local");
  process.exit(1);
}

// Minimal schemas for direct execution
const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    role: String,
    gender: String,
    registrationNumber: String,
    year: Number,
    isActive: Boolean,
  },
  { timestamps: true }
);

const PreferenceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acPreference: String,
    dealBreakers: [String],
    completedAt: Date,
  },
  { timestamps: true }
);

const HostelSchema = new mongoose.Schema(
  {
    name: String,
    code: String,
    gender: String,
    totalFloors: Number,
    allowedYears: [Number],
    facilities: [String],
    isActive: Boolean,
  },
  { timestamps: true }
);

const RoommateGroupSchema = new mongoose.Schema(
  {
    leader: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    gender: String,
    targetSize: Number,
    members: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }],
    status: String,
    isDemo: Boolean,
    roomPreferences: {
      preferredHostels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hostel" }],
      acType: String,
      floorPreference: String,
      updatedAt: Date,
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    preferencesNeedReview: Boolean,
  },
  { timestamps: true }
);

const AllocationIntentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    mode: String,
    preferredRoomSize: Number,
    roomPreferences: {
      preferredHostels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hostel" }],
      acType: String,
      floorPreference: String,
      updatedAt: Date,
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Preference = mongoose.models.Preference || mongoose.model("Preference", PreferenceSchema);
const Hostel = mongoose.models.Hostel || mongoose.model("Hostel", HostelSchema);
const RoommateGroup = mongoose.models.RoommateGroup || mongoose.model("RoommateGroup", RoommateGroupSchema);
const AllocationIntent = mongoose.models.AllocationIntent || mongoose.model("AllocationIntent", AllocationIntentSchema);

async function main() {
  console.log("==================================================================");
  console.log("    HOSTELMATCH: SEED ROOM PREFERENCES FOR DEMO STUDENTS         ");
  console.log("==================================================================");
  console.log("Connecting to MongoDB Atlas...");

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("Connected.");

  // Import pure preference logic
  const { isHostelEligibleForGroup, suggestDefaultAcType, resolveAcConflict } =
    await import("../src/services/roomPreferences/preferenceLogic.js");
  const { AC_OPTIONS, FLOOR_OPTIONS } =
    await import("../src/config/roomPreferences.js");

  // Fetch all active hostels
  const activeHostels = await Hostel.find({ isActive: true }).lean();
  console.log(`Loaded ${activeHostels.length} active campus hostels.`);

  // 1. Update Demo Groups
  const demoGroups = await RoommateGroup.find({
    isDemo: true,
    status: { $in: ["forming", "complete"] },
  });

  console.log(`\nEvaluating ${demoGroups.length} demo roommate groups...`);
  let groupsUpdated = 0;

  for (const group of demoGroups) {
    const memberIds = group.members.map((m) => m.user);
    const [memberUsers, memberPrefs] = await Promise.all([
      User.find({ _id: { $in: memberIds } }).select("gender year name").lean(),
      Preference.find({ student: { $in: memberIds } }).select("student acPreference dealBreakers").lean(),
    ]);

    const pMap = new Map();
    memberPrefs.forEach((p) => {
      if (p.student) pMap.set(p.student.toString(), p);
    });

    const membersWithPrefs = memberUsers.map((u) => ({
      ...u,
      preferences: pMap.get(u._id.toString()) || {},
    }));

    // Find eligible hostels
    const eligibleHostels = activeHostels.filter((h) => {
      const { eligible } = isHostelEligibleForGroup(h, membersWithPrefs);
      return eligible;
    });

    if (eligibleHostels.length === 0) continue;

    // Pick 1 to 3 distinct hostels
    const shuffled = [...eligibleHostels].sort(() => 0.5 - Math.random());
    const countToPick = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 1);
    const pickedHostels = shuffled.slice(0, countToPick).map((h) => h._id);

    // Determine AC preference
    const defaultSuggestion = suggestDefaultAcType(membersWithPrefs);
    let chosenAc = defaultSuggestion;
    if (Math.random() > 0.6) {
      const candidateAc = AC_OPTIONS[Math.floor(Math.random() * AC_OPTIONS.length)];
      if (!resolveAcConflict(candidateAc, membersWithPrefs).conflict) {
        chosenAc = candidateAc;
      }
    }

    // Determine Floor preference
    const chosenFloor = FLOOR_OPTIONS[Math.floor(Math.random() * FLOOR_OPTIONS.length)];

    group.roomPreferences = {
      preferredHostels: pickedHostels,
      acType: chosenAc,
      floorPreference: chosenFloor,
      updatedAt: new Date(),
      updatedBy: group.leader,
    };
    group.preferencesNeedReview = false;

    await group.save();
    groupsUpdated++;
  }

  // 2. Update Demo Auto-Assign Students
  const demoUsers = await User.find({
    registrationNumber: { $regex: /^DEMO-/i },
    role: "student",
  }).select("_id gender year").lean();

  const demoUserIds = demoUsers.map((u) => u._id);
  const autoIntents = await AllocationIntent.find({
    user: { $in: demoUserIds },
    mode: "auto",
  });

  console.log(`\nEvaluating ${autoIntents.length} demo auto-assign student intents...`);
  let autoUpdated = 0;

  for (const intent of autoIntents) {
    const studentUser = demoUsers.find((u) => u._id.toString() === intent.user.toString());
    if (!studentUser) continue;

    const studentPref = await Preference.findOne({ student: studentUser._id }).lean();
    const memberWithPref = { ...studentUser, preferences: studentPref || {} };

    const eligibleHostels = activeHostels.filter((h) => {
      const { eligible } = isHostelEligibleForGroup(h, [memberWithPref]);
      return eligible;
    });

    if (eligibleHostels.length === 0) continue;

    const shuffled = [...eligibleHostels].sort(() => 0.5 - Math.random());
    const countToPick = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 1);
    const pickedHostels = shuffled.slice(0, countToPick).map((h) => h._id);

    const defaultSuggestion = suggestDefaultAcType([memberWithPref]);
    let chosenAc = defaultSuggestion;
    if (Math.random() > 0.6) {
      const candidateAc = AC_OPTIONS[Math.floor(Math.random() * AC_OPTIONS.length)];
      if (!resolveAcConflict(candidateAc, [memberWithPref]).conflict) {
        chosenAc = candidateAc;
      }
    }

    const chosenFloor = FLOOR_OPTIONS[Math.floor(Math.random() * FLOOR_OPTIONS.length)];

    intent.roomPreferences = {
      preferredHostels: pickedHostels,
      acType: chosenAc,
      floorPreference: chosenFloor,
      updatedAt: new Date(),
      updatedBy: intent.user,
    };

    await intent.save();
    autoUpdated++;
  }

  console.log("\n==================================================================");
  console.log("             ROOM PREFERENCES SEEDING SUMMARY                     ");
  console.log("==================================================================");
  console.log(`Demo Roommate Groups Given Preferences:    ${groupsUpdated} of ${demoGroups.length}`);
  console.log(`Demo Auto-Assign Students Given Preferences: ${autoUpdated} of ${autoIntents.length}`);
  console.log("==================================================================");
  console.log("✓ Room preferences seeding completed successfully.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[Seed Room Preferences Error]:", err);
  process.exit(1);
});
