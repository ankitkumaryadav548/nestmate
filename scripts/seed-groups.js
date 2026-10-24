/**
 * ==============================================================================
 * HostelMatch Demo Seed Script: Roommate Groups & Invitations
 * ==============================================================================
 * Usage:
 *   npm run seed:groups
 *   npm run seed:groups -- --count=40
 *   npm run seed:groups -- --reset
 * ==============================================================================
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Seed Groups] Error: .env.local file not found.");
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
  console.error("[Seed Groups] Error: MONGODB_URI is missing in .env.local");
  process.exit(1);
}

// Minimal schemas for execution
const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    role: String,
    gender: String,
    registrationNumber: String,
    course: String,
    department: String,
    year: Number,
    isActive: Boolean,
  },
  { timestamps: true }
);

const StudentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isDemo: { type: Boolean, default: false },
    isPreferencesCompleted: { type: Boolean, default: false },
    userStatus: { type: String, default: "active" },
  },
  { timestamps: true }
);

const PreferenceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sleepSchedule: String,
    studyTime: String,
    nightCalls: String,
    cleanliness: Number,
    noiseTolerance: Number,
    socialLevel: Number,
    acPreference: String,
    foodType: String,
    okWithDifferentFood: Boolean,
    languages: [String],
    dealBreakers: [String],
    completedAt: Date,
  },
  { timestamps: true }
);

const RoommateGroupSchema = new mongoose.Schema(
  {
    leader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    targetSize: { type: Number, required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["forming", "complete", "locked", "disbanded"],
      default: "forming",
    },
    averageScore: { type: Number, default: null },
    lowestPairScore: { type: Number, default: null },
    engineVersion: { type: String, default: "1.0" },
    completedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
    disbandedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false, index: true },
    roomPreferences: {
      preferredHostels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hostel" }],
      acType: { type: String, default: "no-preference" },
      floorPreference: { type: String, default: "any" },
      updatedAt: { type: Date, default: null },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    preferencesNeedReview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const GroupInvitationSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "RoommateGroup", required: true },
    invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled", "expired"],
      default: "pending",
    },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
    scoreSnapshot: {
      average: { type: Number, default: null },
      lowest: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

const AllocationIntentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    mode: { type: String, enum: ["group", "auto"], default: "group" },
    preferredRoomSize: { type: Number, default: 2 },
    roomPreferences: {
      preferredHostels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hostel" }],
      acType: { type: String, default: "no-preference" },
      floorPreference: { type: String, default: "any" },
      updatedAt: { type: Date, default: null },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
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

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const StudentProfile = mongoose.models.StudentProfile || mongoose.model("StudentProfile", StudentProfileSchema);
const Preference = mongoose.models.Preference || mongoose.model("Preference", PreferenceSchema);
const RoommateGroup = mongoose.models.RoommateGroup || mongoose.model("RoommateGroup", RoommateGroupSchema);
const GroupInvitation = mongoose.models.GroupInvitation || mongoose.model("GroupInvitation", GroupInvitationSchema);
const AllocationIntent = mongoose.models.AllocationIntent || mongoose.model("AllocationIntent", AllocationIntentSchema);
const Hostel = mongoose.models.Hostel || mongoose.model("Hostel", HostelSchema);

async function main() {
  const args = process.argv.slice(2);
  let targetCount = 40;
  let isReset = false;

  for (const arg of args) {
    if (arg === "--reset") isReset = true;
    if (arg.startsWith("--count=")) {
      targetCount = parseInt(arg.split("=")[1], 10) || 40;
    }
  }

  console.log("==================================================================");
  console.log("     HOSTELMATCH: ROOMMATE GROUPS & INTENT SEED SCRIPT           ");
  console.log("==================================================================");
  console.log(`Connecting to MongoDB Atlas...`);

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log(`Connected to database.`);

  // Load pure group score engine and matching weights
  const { calculateGroupScore, canJoinGroup } = await import("../src/services/matching/groupScore.js");
  const { DEFAULT_WEIGHTS } = await import("../src/config/matching.js");
  const { MIN_PAIR_SCORE } = await import("../src/config/groups.js");

  // Load pure room preference logic & configs
  const { isHostelEligibleForGroup, suggestDefaultAcType, resolveAcConflict } =
    await import("../src/services/roomPreferences/preferenceLogic.js");
  const { AC_OPTIONS, FLOOR_OPTIONS } =
    await import("../src/config/roomPreferences.js");

  // Fetch active hostels
  const activeHostels = await Hostel.find({ isActive: true }).lean();
  console.log(`Loaded ${activeHostels.length} active hostels for room preference assignments.`);

  // Identify demo students safely
  const demoUsers = await User.find({
    registrationNumber: { $regex: /^DEMO-/i },
    role: "student",
  }).lean();

  const demoUserIds = demoUsers.map((u) => u._id);
  console.log(`Identified ${demoUserIds.length} demo student accounts in database.`);

  if (isReset) {
    console.log(`\n[RESET MODE] Deleting all demo groups, demo invitations, and demo auto-intents...`);
    const delGroups = await RoommateGroup.deleteMany({ isDemo: true });
    const delInvites = await GroupInvitation.deleteMany({
      $or: [{ invitedUser: { $in: demoUserIds } }, { invitedBy: { $in: demoUserIds } }],
    });
    const delIntents = await AllocationIntent.deleteMany({
      user: { $in: demoUserIds },
    });

    console.log(`✓ Deleted ${delGroups.deletedCount} demo roommate groups.`);
    console.log(`✓ Deleted ${delInvites.deletedCount} demo group invitations.`);
    console.log(`✓ Deleted ${delIntents.deletedCount} demo allocation intents.`);
    console.log(`All real student accounts and admin configurations were untouched.`);
    console.log("Reset complete.");
    await mongoose.disconnect();
    process.exit(0);
  }

  // Pre-clean previous demo groups and intents to avoid duplicates on re-seed
  console.log(`Clearing existing demo groups & demo intents before re-seeding...`);
  await RoommateGroup.deleteMany({ isDemo: true });
  await GroupInvitation.deleteMany({
    $or: [{ invitedUser: { $in: demoUserIds } }, { invitedBy: { $in: demoUserIds } }],
  });
  await AllocationIntent.deleteMany({ user: { $in: demoUserIds } });

  // Fetch preferences for demo students
  const demoPrefs = await Preference.find({
    student: { $in: demoUserIds },
    completedAt: { $ne: null },
  }).lean();

  const prefMap = new Map();
  demoPrefs.forEach((p) => prefMap.set(p.student.toString(), p));

  // Eligible pool of demo students with completed preferences
  const eligibleStudents = demoUsers
    .filter((u) => u.isActive && prefMap.has(u._id.toString()))
    .map((u) => ({
      ...u,
      preferences: prefMap.get(u._id.toString()),
    }));

  console.log(`Total eligible demo students with completed preferences: ${eligibleStudents.length}`);

  // Split by gender
  const males = eligibleStudents.filter((s) => s.gender === "male");
  const females = eligibleStudents.filter((s) => s.gender === "female");

  console.log(`Available: ${males.length} males, ${females.length} females.`);

  const assignedUserIds = new Set();
  const createdGroups = [];

  // Distribution of target sizes: ~35% 2-bed, ~35% 3-bed, ~30% 4-bed
  const targetSizes = [2, 3, 4];
  // 60% complete, 40% forming
  const completeTarget = Math.round(targetCount * 0.6);

  console.log(`\nSynthesizing ${targetCount} groups (~${completeTarget} complete, ~${targetCount - completeTarget} forming)...`);

  for (let i = 0; i < targetCount; i++) {
    const isComplete = i < completeTarget;
    const targetSize = targetSizes[i % targetSizes.length];
    const gender = i % 2 === 0 ? "male" : "female";
    const pool = gender === "male" ? males : females;

    // Available candidates from pool
    const available = pool.filter((s) => !assignedUserIds.has(s._id.toString()));
    if (available.length < 1) {
      // If depleted, continue to other gender or break
      continue;
    }

    // Pick a leader
    const leader = available[0];
    const currentMembers = [leader];
    assignedUserIds.add(leader._id.toString());

    // Determine how many members to add
    // If complete: targetSize
    // If forming: 1 to targetSize - 1
    const desiredMemberCount = isComplete
      ? targetSize
      : Math.max(1, Math.min(targetSize - 1, 1 + ((i % 3))));

    while (currentMembers.length < desiredMemberCount) {
      // Find compatible candidate
      const remainingCandidates = pool.filter((s) => !assignedUserIds.has(s._id.toString()));
      if (remainingCandidates.length === 0) break;

      let bestCandidate = null;
      let highestAvg = -1;

      for (const candidate of remainingCandidates) {
        const joinCheck = canJoinGroup(
          candidate,
          currentMembers,
          DEFAULT_WEIGHTS,
          MIN_PAIR_SCORE
        );

        if (joinCheck.allowed && joinCheck.average > highestAvg) {
          highestAvg = joinCheck.average;
          bestCandidate = candidate;
        }
      }

      if (!bestCandidate) {
        // No compatible candidate found for this cluster
        break;
      }

      currentMembers.push(bestCandidate);
      assignedUserIds.add(bestCandidate._id.toString());
    }

    // Compute final group scores
    const groupScores = calculateGroupScore(currentMembers, DEFAULT_WEIGHTS);
    const actualStatus = currentMembers.length === targetSize ? "complete" : "forming";

    // Generate realistic room preferences for group
    const eligibleHostels = activeHostels.filter((h) => {
      const { eligible } = isHostelEligibleForGroup(h, currentMembers);
      return eligible;
    });

    let groupPreferences = {
      preferredHostels: [],
      acType: "no-preference",
      floorPreference: "any",
      updatedAt: null,
      updatedBy: null,
    };

    if (eligibleHostels.length > 0) {
      const shuffled = [...eligibleHostels].sort(() => 0.5 - Math.random());
      const countToPick = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 1);
      const pickedHostels = shuffled.slice(0, countToPick).map((h) => h._id);

      const defaultSuggestion = suggestDefaultAcType(currentMembers);
      let chosenAc = defaultSuggestion;
      if (Math.random() > 0.5) {
        const candidateAc = AC_OPTIONS[Math.floor(Math.random() * AC_OPTIONS.length)];
        if (!resolveAcConflict(candidateAc, currentMembers).conflict) {
          chosenAc = candidateAc;
        }
      }

      const chosenFloor = FLOOR_OPTIONS[Math.floor(Math.random() * FLOOR_OPTIONS.length)];

      groupPreferences = {
        preferredHostels: pickedHostels,
        acType: chosenAc,
        floorPreference: chosenFloor,
        updatedAt: new Date(),
        updatedBy: leader._id,
      };
    }

    const newGroup = await RoommateGroup.create({
      leader: leader._id,
      gender: leader.gender,
      targetSize,
      members: currentMembers.map((m) => ({
        user: m._id,
        joinedAt: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 3600 * 1000)),
      })),
      status: actualStatus,
      averageScore: groupScores.average,
      lowestPairScore: groupScores.lowest,
      engineVersion: "1.0",
      completedAt: actualStatus === "complete" ? new Date() : null,
      roomPreferences: groupPreferences,
      isDemo: true,
    });

    createdGroups.push(newGroup);

    // Also update AllocationIntent for group members
    for (const member of currentMembers) {
      await AllocationIntent.findOneAndUpdate(
        { user: member._id },
        { mode: "group", preferredRoomSize: targetSize, roomPreferences: groupPreferences },
        { upsert: true }
      );
    }

    // For some forming groups, send a pending invitation to an unassigned student
    if (actualStatus === "forming" && currentMembers.length < targetSize) {
      const remainingUnassigned = pool.filter((s) => !assignedUserIds.has(s._id.toString()));
      if (remainingUnassigned.length > 0) {
        const inviteCandidate = remainingUnassigned[0];
        const check = canJoinGroup(inviteCandidate, currentMembers, DEFAULT_WEIGHTS, MIN_PAIR_SCORE);
        if (check.allowed) {
          await GroupInvitation.create({
            group: newGroup._id,
            invitedUser: inviteCandidate._id,
            invitedBy: leader._id,
            status: "pending",
            expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
            scoreSnapshot: {
              average: check.average,
              lowest: check.lowest,
            },
          });
        }
      }
    }
  }

  // Next, place ~30 demo students into the auto-assign pool
  const remainingForAuto = eligibleStudents.filter((s) => !assignedUserIds.has(s._id.toString()));
  const autoPoolStudents = remainingForAuto.slice(0, 30);

  for (const student of autoPoolStudents) {
    const randomSize = targetSizes[Math.floor(Math.random() * targetSizes.length)];

    const eligibleHostels = activeHostels.filter((h) => {
      const { eligible } = isHostelEligibleForGroup(h, [student]);
      return eligible;
    });

    let studentPrefs = {
      preferredHostels: [],
      acType: "no-preference",
      floorPreference: "any",
      updatedAt: null,
      updatedBy: null,
    };

    if (eligibleHostels.length > 0) {
      const shuffled = [...eligibleHostels].sort(() => 0.5 - Math.random());
      const countToPick = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 1);
      const pickedHostels = shuffled.slice(0, countToPick).map((h) => h._id);

      const defaultSuggestion = suggestDefaultAcType([student]);
      const chosenFloor = FLOOR_OPTIONS[Math.floor(Math.random() * FLOOR_OPTIONS.length)];

      studentPrefs = {
        preferredHostels: pickedHostels,
        acType: defaultSuggestion,
        floorPreference: chosenFloor,
        updatedAt: new Date(),
        updatedBy: student._id,
      };
    }

    await AllocationIntent.findOneAndUpdate(
      { user: student._id },
      { mode: "auto", preferredRoomSize: randomSize, roomPreferences: studentPrefs },
      { upsert: true }
    );
  }

  // Summary counts
  const completeCount = createdGroups.filter((g) => g.status === "complete").length;
  const formingCount = createdGroups.filter((g) => g.status === "forming").length;
  const bySize = {
    2: createdGroups.filter((g) => g.targetSize === 2).length,
    3: createdGroups.filter((g) => g.targetSize === 3).length,
    4: createdGroups.filter((g) => g.targetSize === 4).length,
  };

  const totalInGroups = createdGroups.reduce((acc, g) => acc + g.members.length, 0);
  const totalInAuto = autoPoolStudents.length;
  const totalUngrouped = eligibleStudents.length - totalInGroups - totalInAuto;

  console.log("\n==================================================================");
  console.log("               ROOMMATE GROUP SEEDING SUMMARY                     ");
  console.log("==================================================================");
  console.log(`Total Groups Created:      ${createdGroups.length}`);
  console.log(`  - Complete Groups:       ${completeCount} (${Math.round((completeCount / createdGroups.length) * 100)}%)`);
  console.log(`  - Forming Groups:        ${formingCount} (${Math.round((formingCount / createdGroups.length) * 100)}%)`);
  console.log(`\nBreakdown by Target Size:`);
  console.log(`  - 2-Bed Groups:          ${bySize[2]}`);
  console.log(`  - 3-Bed Groups:          ${bySize[3]}`);
  console.log(`  - 4-Bed Groups:          ${bySize[4]}`);
  console.log(`\nStudent Allocation State:`);
  console.log(`  - Students in Groups:    ${totalInGroups}`);
  console.log(`  - Students in Auto Pool: ${totalInAuto}`);
  console.log(`  - Remaining Ungrouped:   ${totalUngrouped}`);
  console.log("==================================================================");
  console.log("✓ Seeding successfully finished without affecting non-demo data.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[Seed Groups Error]:", err);
  process.exit(1);
});
