/**
 * ==============================================================================
 * HostelMatch: Purge All Demo Data
 * ==============================================================================
 * Removes ALL demo/dummy data from the database in one step.
 * This includes:
 *   - Demo students (User records with isDemo: true)
 *   - Their StudentProfile and Preference documents
 *   - Demo roommate groups, invitations, and allocation intents
 *   - Demo room preferences (RoomPreference docs linked to demo users)
 *
 * Real student accounts, admin accounts, hostels, and rooms are NEVER touched.
 *
 * Usage:
 *   node scripts/purge-demo-data.js
 *   npm run purge:demo
 * ==============================================================================
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// ── Load .env.local ────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Purge Demo] Error: .env.local file not found.");
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
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[Purge Demo] Error: MONGODB_URI is missing in .env.local");
  process.exit(1);
}

// ── Minimal Mongoose Schemas ───────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({ isDemo: Boolean }, { collection: "users" });
const StudentProfileSchema = new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId }, { collection: "studentprofiles" });
const PreferenceSchema = new mongoose.Schema({ student: mongoose.Schema.Types.ObjectId }, { collection: "preferences" });
const RoommateGroupSchema = new mongoose.Schema({ isDemo: Boolean, members: [{ user: mongoose.Schema.Types.ObjectId }] }, { collection: "roommategroups" });
const GroupInvitationSchema = new mongoose.Schema({ inviter: mongoose.Schema.Types.ObjectId, invitee: mongoose.Schema.Types.ObjectId }, { collection: "groupinvitations" });
const AllocationIntentSchema = new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId }, { collection: "allocationintents" });
const RoomPreferenceSchema = new mongoose.Schema({ student: mongoose.Schema.Types.ObjectId }, { collection: "roompreferences" });

const User            = mongoose.model("User",            UserSchema);
const StudentProfile  = mongoose.model("StudentProfile",  StudentProfileSchema);
const Preference      = mongoose.model("Preference",      PreferenceSchema);
const RoommateGroup   = mongoose.model("RoommateGroup",   RoommateGroupSchema);
const GroupInvitation = mongoose.model("GroupInvitation", GroupInvitationSchema);
const AllocationIntent = mongoose.model("AllocationIntent", AllocationIntentSchema);
const RoomPreference  = mongoose.model("RoomPreference",  RoomPreferenceSchema);

// ── Main ───────────────────────────────────────────────────────────────────────
async function purgeDemo() {
  console.log("\n================================================================");
  console.log("         HOSTELMATCH — PURGE ALL DEMO / DUMMY DATA");
  console.log("================================================================\n");
  console.log("[Purge Demo] Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("[Purge Demo] Connected.\n");

  // Step 1: find all demo user IDs
  const demoUsers = await User.find({ isDemo: true }).select("_id").lean();
  const demoIds   = demoUsers.map((u) => u._id);

  if (demoIds.length === 0) {
    console.log("✓ No demo students found in the database. Nothing to delete.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`Found ${demoIds.length} demo student account(s). Purging...\n`);

  // Step 2: delete all related documents
  const [profRes, prefRes, roomPrefRes, intentRes, inviteRes, groupRes, userRes] =
    await Promise.all([
      StudentProfile.deleteMany({ user: { $in: demoIds } }),
      Preference.deleteMany({ student: { $in: demoIds } }),
      RoomPreference.deleteMany({ student: { $in: demoIds } }),
      AllocationIntent.deleteMany({ user: { $in: demoIds } }),
      GroupInvitation.deleteMany({
        $or: [{ inviter: { $in: demoIds } }, { invitee: { $in: demoIds } }],
      }),
      RoommateGroup.deleteMany({ isDemo: true }),
      User.deleteMany({ _id: { $in: demoIds } }),
    ]);

  // Step 3: report
  console.log("================================================================");
  console.log("                  PURGE COMPLETE — SUMMARY");
  console.log("================================================================");
  console.log(`Demo Users Deleted           : ${userRes.deletedCount}`);
  console.log(`Student Profiles Deleted     : ${profRes.deletedCount}`);
  console.log(`Preferences Deleted          : ${prefRes.deletedCount}`);
  console.log(`Room Preferences Deleted     : ${roomPrefRes.deletedCount}`);
  console.log(`Allocation Intents Deleted   : ${intentRes.deletedCount}`);
  console.log(`Group Invitations Deleted    : ${inviteRes.deletedCount}`);
  console.log(`Roommate Groups Deleted      : ${groupRes.deletedCount}`);
  console.log("----------------------------------------------------------------");
  console.log("Real student and admin accounts were NOT touched.");
  console.log("Hostels and rooms were NOT touched.");
  console.log("================================================================\n");

  await mongoose.disconnect();
  console.log("[Purge Demo] Disconnected. Done.");
  process.exit(0);
}

purgeDemo().catch((err) => {
  console.error("[Purge Demo] Fatal error:", err);
  process.exit(1);
});

