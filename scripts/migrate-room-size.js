/**
 * Demo Data Migration: Room Size Assignment
 *
 * For DEMO students (isDemo: true) whose Preference has no roomSize:
 * 1. If in an active group (forming, complete, locked) -> set roomSize to group.targetSize.
 * 2. Else if an AllocationIntent exists -> use its preferredRoomSize.
 * 3. Else pick randomly with weights: 1: 10%, 2: 35%, 3: 25%, 4: 30% (fixed seed PRNG).
 *
 * Where a demo group's members have different sizes, force all members to the group's targetSize.
 * Updates AllocationIntent.preferredRoomSize to match.
 *
 * NEVER touches non-demo students. Reports how many REAL students still lack roomSize.
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   npm run migrate:roomsize
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Migrate Room Size] Error: .env.local file not found.");
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
  console.error("[Migrate Room Size] Error: MONGODB_URI is missing in .env.local");
  process.exit(1);
}

// Fixed seed pseudo-random number generator (Mulberry32)
function createRng(seed = 42) {
  let s = Math.floor(Math.abs(seed)) || 1;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(42);

// Weighted random room size: 1 (10%), 2 (35%), 3 (25%), 4 (30%)
function pickWeightedRoomSize() {
  const r = rng();
  if (r < 0.10) return 1;
  if (r < 0.45) return 2;
  if (r < 0.70) return 3;
  return 4;
}

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    role: String,
    isDemo: Boolean,
  },
  { timestamps: true }
);

const PreferenceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    roomSize: Number,
    completedAt: Date,
  },
  { timestamps: true }
);

const RoommateGroupSchema = new mongoose.Schema(
  {
    leader: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    targetSize: Number,
    status: String,
    isDemo: Boolean,
    members: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, joinedAt: Date }],
  },
  { timestamps: true }
);

const AllocationIntentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    mode: String,
    preferredRoomSize: Number,
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Preference = mongoose.models.Preference || mongoose.model("Preference", PreferenceSchema);
const RoommateGroup = mongoose.models.RoommateGroup || mongoose.model("RoommateGroup", RoommateGroupSchema);
const AllocationIntent = mongoose.models.AllocationIntent || mongoose.model("AllocationIntent", AllocationIntentSchema);

async function migrateRoomSize() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("[Migrate Room Size] Connected to MongoDB Atlas.\n");

    // 1. Where a demo group's members have different sizes, force all members to the group's targetSize
    const activeDemoGroups = await RoommateGroup.find({
      isDemo: true,
      status: { $in: ["forming", "complete", "locked"] },
    }).lean();

    console.log(`[Migrate Room Size] Checking ${activeDemoGroups.length} active demo groups for member consistency...`);
    let groupMembersSynced = 0;

    for (const group of activeDemoGroups) {
      const memberIds = (group.members || []).map((m) => m.user);
      if (memberIds.length === 0) continue;

      const groupTargetSize = group.targetSize;
      const res = await Preference.updateMany(
        { student: { $in: memberIds }, roomSize: { $ne: groupTargetSize } },
        { $set: { roomSize: groupTargetSize } }
      );
      if (res.modifiedCount > 0) {
        groupMembersSynced += res.modifiedCount;
      }

      await AllocationIntent.updateMany(
        { user: { $in: memberIds }, preferredRoomSize: { $ne: groupTargetSize } },
        { $set: { preferredRoomSize: groupTargetSize } }
      );
    }
    console.log(`  -> Synced ${groupMembersSynced} demo group members to their group's targetSize.\n`);

    // 2. Fetch all demo students
    const demoStudents = await User.find({ role: "student", isDemo: true }).select("_id").lean();
    const demoStudentIds = demoStudents.map((s) => s._id);
    console.log(`[Migrate Room Size] Total demo students: ${demoStudentIds.length}`);

    // Map active group target sizes for quick lookup
    const studentToGroupTargetSize = new Map();
    for (const group of activeDemoGroups) {
      for (const m of group.members || []) {
        if (m.user) {
          studentToGroupTargetSize.set(m.user.toString(), group.targetSize);
        }
      }
    }

    // Fetch intents for demo students
    const demoIntents = await AllocationIntent.find({ user: { $in: demoStudentIds } }).lean();
    const intentMap = new Map();
    demoIntents.forEach((i) => {
      if (i.user) intentMap.set(i.user.toString(), i.preferredRoomSize);
    });

    // Find demo preferences without roomSize
    const demoPrefsWithoutRoomSize = await Preference.find({
      student: { $in: demoStudentIds },
      $or: [{ roomSize: null }, { roomSize: { $exists: false } }],
    });

    console.log(`[Migrate Room Size] Demo preferences lacking roomSize: ${demoPrefsWithoutRoomSize.length}`);

    let assignedFromGroup = 0;
    let assignedFromIntent = 0;
    let assignedFromWeights = 0;

    for (const pref of demoPrefsWithoutRoomSize) {
      const sId = pref.student.toString();
      let chosenSize;

      if (studentToGroupTargetSize.has(sId)) {
        chosenSize = studentToGroupTargetSize.get(sId);
        assignedFromGroup++;
      } else if (intentMap.has(sId) && [1, 2, 3, 4].includes(intentMap.get(sId))) {
        chosenSize = intentMap.get(sId);
        assignedFromIntent++;
      } else {
        chosenSize = pickWeightedRoomSize();
        assignedFromWeights++;
      }

      pref.roomSize = chosenSize;
      await pref.save();

      // Sync AllocationIntent
      await AllocationIntent.updateOne(
        { user: pref.student },
        { $set: { preferredRoomSize: chosenSize } }
      );
    }

    // Count demo students per room size
    const demoSizeCounts = { 1: 0, 2: 0, 3: 0, 4: 0, unassigned: 0 };
    const allDemoPrefs = await Preference.find({ student: { $in: demoStudentIds } }).lean();
    for (const p of allDemoPrefs) {
      if (p.roomSize && demoSizeCounts[p.roomSize] !== undefined) {
        demoSizeCounts[p.roomSize]++;
      } else {
        demoSizeCounts.unassigned++;
      }
    }

    // 3. Report REAL (non-demo) students without roomSize (NEVER touch them)
    const realStudents = await User.find({ role: "student", isDemo: { $ne: true } }).select("_id").lean();
    const realStudentIds = realStudents.map((s) => s._id);
    const realLackingRoomSize = await Preference.countDocuments({
      student: { $in: realStudentIds },
      $or: [{ roomSize: null }, { roomSize: { $exists: false } }],
    });

    console.log("\n================ Migration Summary ================");
    console.log(`Demo preferences updated       : ${demoPrefsWithoutRoomSize.length}`);
    console.log(`  - From active group targetSize : ${assignedFromGroup}`);
    console.log(`  - From AllocationIntent        : ${assignedFromIntent}`);
    console.log(`  - Randomly weighted (seed: 42) : ${assignedFromWeights}`);
    console.log("---------------------------------------------------");
    console.log("Demo Students per Room Size:");
    console.log(`  • Single room (1 bed) : ${demoSizeCounts[1]}`);
    console.log(`  • Shared by 2 (2 beds): ${demoSizeCounts[2]}`);
    console.log(`  • Shared by 3 (3 beds): ${demoSizeCounts[3]}`);
    console.log(`  • Shared by 4 (4 beds): ${demoSizeCounts[4]}`);
    if (demoSizeCounts.unassigned > 0) {
      console.log(`  • Unassigned          : ${demoSizeCounts.unassigned}`);
    }
    console.log("---------------------------------------------------");
    console.log(`REAL (non-demo) students without roomSize: ${realLackingRoomSize}`);
    console.log(`(Real students will see their preferences as incomplete until they answer the Room Type question)`);
    console.log("===================================================\n");
  } catch (err) {
    console.error("[Migrate Room Size] Fatal error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("[Migrate Room Size] Database connection closed.");
  }
}

migrateRoomSize();

