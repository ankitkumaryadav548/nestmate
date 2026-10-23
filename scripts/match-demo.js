/**
 * ==============================================================================
 * HostelMatch Roommate Compatibility Match Demo Script
 * ==============================================================================
 * Demonstrates the pure scoring engine, deal-breaker exclusions, and top matches.
 * 
 * Usage:
 *   npm run match:demo
 *   npm run match:demo -- --reg=DEMO-0001
 *   npm run match:demo -- --reg=DEMO-0042
 * ==============================================================================
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Match Demo] Error: .env.local file not found.");
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
  console.error("[Match Demo] Error: MONGODB_URI is missing in .env.local");
  process.exit(1);
}

// Minimal schemas for read-only demonstration
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

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Preference = mongoose.models.Preference || mongoose.model("Preference", PreferenceSchema);

async function runDemo() {
  let targetReg = "DEMO-0001";
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--reg=")) {
      targetReg = arg.split("=")[1].trim();
    }
  }

  console.log("==================================================================");
  console.log("       HOSTELMATCH: ROOMMATE COMPATIBILITY MATCH DEMO            ");
  console.log("==================================================================");
  console.log(`[Database] Connecting to MongoDB Atlas...`);

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log(`[Database] Connected.`);

  // Load pure scoring engine and config via dynamic import
  const { calculateCompatibility } = await import("../src/services/matching/scoreEngine.js");
  const { DEFAULT_WEIGHTS } = await import("../src/config/matching.js");

  // Find target student
  let student = await User.findOne({
    registrationNumber: new RegExp(`^${targetReg}$`, "i"),
    role: "student",
  }).lean();

  if (!student) {
    console.log(`[Match Demo] Student with registration "${targetReg}" not found. Falling back to first available student...`);
    student = await User.findOne({ role: "student", isActive: true }).lean();
  }

  if (!student) {
    console.error(`[Match Demo] No students found in database. Run "npm run seed:students" first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const studentPref = await Preference.findOne({ student: student._id }).lean();
  if (!studentPref || !studentPref.completedAt) {
    console.error(`[Match Demo] Student ${student.name} (${student.registrationNumber}) has not completed their preferences questionnaire.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  student.preferences = studentPref;

  console.log(`\n📋 Target Student Profile:`);
  console.log(`   Name        : ${student.name}`);
  console.log(`   Reg Number  : ${student.registrationNumber || "N/A"}`);
  console.log(`   Gender Pool : ${student.gender.toUpperCase()} (Strict Gender Isolation)`);
  console.log(`   Academic    : Year ${student.year} • ${student.course} (${student.department})`);
  console.log(`   Lifestyle   : Sleep=${studentPref.sleepSchedule}, Study=${studentPref.studyTime}, Food=${studentPref.foodType}, AC=${studentPref.acPreference}`);
  console.log(`   Languages   : ${(studentPref.languages || []).join(", ") || "None"}`);
  console.log(`   DealBreakers: ${(studentPref.dealBreakers || []).join(", ") || "None declared"}`);

  // Load candidate pool of identical gender
  const candidates = await User.find({
    role: "student",
    isActive: true,
    gender: student.gender,
    _id: { $ne: student._id },
  }).select("name course department year gender registrationNumber").lean();

  const candidateIds = candidates.map((c) => c._id);
  const candidatePrefs = await Preference.find({
    student: { $in: candidateIds },
    completedAt: { $ne: null },
  }).lean();

  const prefMap = new Map();
  for (const p of candidatePrefs) {
    prefMap.set(p.student.toString(), p);
  }

  console.log(`\n⚙️ Running Compatibility Engine across candidate pool...`);
  let evaluatedCount = 0;
  let excludedCount = 0;
  const violationCounts = {};
  const eligibleMatches = [];

  for (const candidate of candidates) {
    const pref = prefMap.get(candidate._id.toString());
    if (!pref) continue; // questionnaire incomplete

    candidate.preferences = pref;
    evaluatedCount++;

    const result = calculateCompatibility(student, candidate, DEFAULT_WEIGHTS);

    if (result.excluded) {
      excludedCount++;
      for (const v of result.violations || []) {
        violationCounts[v.key] = (violationCounts[v.key] || 0) + 1;
      }
      continue;
    }

    eligibleMatches.push({
      candidate,
      result,
    });
  }

  // Sort matches by score DESC, same year DESC, name ASC
  eligibleMatches.sort((a, b) => {
    if (b.result.score !== a.result.score) return b.result.score - a.result.score;
    const aSame = a.candidate.year === student.year ? 1 : 0;
    const bSame = b.candidate.year === student.year ? 1 : 0;
    if (bSame !== aSame) return bSame - aSame;
    return (a.candidate.name || "").localeCompare(b.candidate.name || "");
  });

  console.log(`\n==================================================================`);
  console.log(`                     EVALUATION SUMMARY                          `);
  console.log(`==================================================================`);
  console.log(`Total Candidates Evaluated : ${evaluatedCount}`);
  console.log(`Eligible Matches           : ${eligibleMatches.length}`);
  console.log(`Excluded by Deal-Breakers  : ${excludedCount}`);
  if (Object.keys(violationCounts).length > 0) {
    console.log(`Deal-Breaker Triggers Breakdown:`);
    for (const [key, count] of Object.entries(violationCounts)) {
      console.log(`   - ${key.padEnd(16)} : ${count} pair violations`);
    }
  }

  console.log(`\n==================================================================`);
  console.log(`              TOP 5 COMPATIBLE ROOMMATE MATCHES                   `);
  console.log(`==================================================================`);

  const top5 = eligibleMatches.slice(0, 5);
  if (top5.length === 0) {
    console.log(`No eligible matches found within current constraints.`);
  } else {
    top5.forEach(({ candidate, result }, index) => {
      console.log(`\n#${index + 1} | Score: ${result.score}% [${result.label.toUpperCase()}] (Base: ${result.baseScore}%, YearBonus: +${result.yearBonus}%)`);
      console.log(`     Candidate    : ${candidate.name} (${candidate.registrationNumber || "N/A"})`);
      console.log(`     Program      : Year ${candidate.year} • ${candidate.course} - ${candidate.department}`);
      console.log(`     Shared Langs : ${result.sharedLanguages.join(", ") || "None"}`);
      console.log(`     Key Reasons  : ${result.reasons.slice(0, 3).join(" | ")}`);
      if (result.warnings.length > 0) {
        console.log(`     Warnings     : ${result.warnings[0]}`);
      }
    });
  }

  console.log(`\n==================================================================`);
  console.log(`Demonstration finished. No database records were modified.`);
  console.log(`==================================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

runDemo().catch(async (err) => {
  console.error("[Match Demo Error]:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
