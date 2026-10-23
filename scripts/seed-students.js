/**
 * ==============================================================================
 * HostelMatch Demo Student Seed Script
 * ==============================================================================
 * NOTE: This is purely demonstration / mock data for testing roommate allocation
 * algorithms and administrative management.
 * All demo records are marked with isDemo: true.
 *
 * Usage:
 *   npm run seed:students
 *   npm run seed:students -- --count=300
 *   npm run seed:students -- --reset
 * ==============================================================================
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Seed Students] Error: .env.local file not found.");
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
const DEMO_PASSWORD = process.env.DEMO_STUDENT_PASSWORD || "DemoStudentPass123!";

if (!MONGODB_URI) {
  console.error("[Seed Students] Error: MONGODB_URI is missing in .env.local");
  process.exit(1);
}

// Schemas for the seed script
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    gender: { type: String, enum: ["male", "female", "other"] },
    registrationNumber: { type: String, sparse: true, unique: true },
    phone: { type: String, default: "" },
    course: { type: String, default: "" },
    department: { type: String, default: "" },
    year: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const StudentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    homeState: { type: String, default: "" },
    homeCountry: { type: String, default: "India" },
    isInternational: { type: Boolean, default: false, index: true },
    homeTimeZone: { type: String, default: "Asia/Kolkata" },
    arrivalDate: { type: Date, default: null },
    emergencyContactName: { type: String, default: "" },
    emergencyContactPhone: { type: String, default: "" },
    profileCompletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const PreferenceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    sleepSchedule: { type: String, default: null },
    studyTime: { type: String, default: null },
    nightCalls: { type: String, default: null },
    cleanliness: { type: Number, default: null },
    noiseTolerance: { type: Number, default: null },
    socialLevel: { type: Number, default: null },
    acPreference: { type: String, default: null },
    foodType: { type: String, default: null },
    okWithDifferentFood: { type: Boolean, default: null },
    languages: { type: [String], default: [] },
    culturalComfort: { type: String, default: "no-preference" },
    dealBreakers: { type: [String], default: [] },
    completedAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const StudentProfile = mongoose.models.StudentProfile || mongoose.model("StudentProfile", StudentProfileSchema);
const Preference = mongoose.models.Preference || mongoose.model("Preference", PreferenceSchema);

// Parse CLI flags
const args = process.argv.slice(2);
let isReset = false;
let targetCount = 300;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--reset") {
    isReset = true;
  } else if (arg.startsWith("--count=")) {
    targetCount = parseInt(arg.split("=")[1], 10) || 300;
  } else if (arg === "--count" && args[i + 1]) {
    targetCount = parseInt(args[i + 1], 10) || 300;
    i++;
  }
}

// Realistic pools of demo data
const INDIAN_MALE_FIRST_NAMES = [
  "Aarav", "Rohan", "Aditya", "Vikram", "Karan", "Siddharth", "Arjun", "Anand",
  "Nikhil", "Pranav", "Rahul", "Mayank", "Abhishek", "Varun", "Gaurav", "Harsh",
  "Rishi", "Kartik", "Ayush", "Tanmay", "Dev", "Surya", "Deepak", "Manish",
  "Aakash", "Vishal", "Sanjay", "Amit", "Kunal", "Tushar"
];

const INDIAN_FEMALE_FIRST_NAMES = [
  "Ananya", "Ishita", "Pooja", "Diya", "Sneha", "Kavya", "Riya", "Aditi",
  "Shreya", "Tanvi", "Meera", "Neha", "Divya", "Sanya", "Simran", "Priya",
  "Aashi", "Nandini", "Pallavi", "Swati", "Anushka", "Bhavna", "Kritika", "Preeti"
];

const INDIAN_LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Gupta", "Iyer", "Nair", "Reddy", "Rao",
  "Deshmukh", "Kulkarni", "Singh", "Choudhury", "Das", "Banerjee", "Chatterjee",
  "Joshi", "Bhat", "Mehta", "Shah", "Gowda", "Menon", "Pillai", "Agarwal",
  "Mishra", "Pandey", "Tripathi", "Goswami", "Bora", "Barman", "Mandal"
];

const ACADEMIC_PROGRAMS = [
  { course: "B.Tech Computer Science & Engineering", department: "Computer Science & Engineering" },
  { course: "B.Tech Electronics & Communication", department: "Electronics & Communication" },
  { course: "B.Tech Mechanical Engineering", department: "Mechanical Engineering" },
  { course: "B.Tech Civil Engineering", department: "Civil Engineering" },
  { course: "B.Tech Artificial Intelligence", department: "Computer Science & Engineering" },
  { course: "MBBS", department: "School of Medical Sciences" },
  { course: "B.Sc Nursing", department: "College of Nursing" },
  { course: "BBA", department: "School of Management" },
  { course: "MBA", department: "Graduate School of Business" },
  { course: "B.Com (Honours)", department: "Department of Commerce" },
  { course: "B.Des (Product Design)", department: "School of Design" },
  { course: "BA Psychology", department: "Department of Humanities" },
  { course: "M.Sc Biotechnology", department: "Department of Life Sciences" },
  { course: "B.Pharma", department: "School of Pharmacy" },
];

const INDIAN_REGIONS = [
  // North
  { state: "Delhi (NCT)", languages: ["Hindi", "English", "Punjabi"] },
  { state: "Uttar Pradesh", languages: ["Hindi", "Urdu", "English"] },
  { state: "Punjab", languages: ["Punjabi", "Hindi", "English"] },
  { state: "Haryana", languages: ["Hindi", "English", "Punjabi"] },
  { state: "Rajasthan", languages: ["Hindi", "English"] },
  { state: "Himachal Pradesh", languages: ["Hindi", "English"] },
  { state: "Jammu and Kashmir", languages: ["Urdu", "Hindi", "English"] },
  // South
  { state: "Tamil Nadu", languages: ["Tamil", "English"] },
  { state: "Karnataka", languages: ["Kannada", "English", "Hindi"] },
  { state: "Kerala", languages: ["Malayalam", "English"] },
  { state: "Telangana", languages: ["Telugu", "Hindi", "English"] },
  { state: "Andhra Pradesh", languages: ["Telugu", "English"] },
  // West
  { state: "Maharashtra", languages: ["Marathi", "Hindi", "English"] },
  { state: "Gujarat", languages: ["Gujarati", "Hindi", "English"] },
  { state: "Goa", languages: ["English", "Hindi", "Marathi"] },
  // East
  { state: "West Bengal", languages: ["Bengali", "English", "Hindi"] },
  { state: "Bihar", languages: ["Hindi", "English"] },
  { state: "Odisha", languages: ["Odia", "Hindi", "English"] },
  { state: "Jharkhand", languages: ["Hindi", "English"] },
  // Northeast
  { state: "Assam", languages: ["Assamese", "English", "Hindi"] },
  { state: "Meghalaya", languages: ["English", "Hindi"] },
  { state: "Sikkim", languages: ["Nepali", "Hindi", "English"] },
  { state: "Manipur", languages: ["English", "Hindi"] },
];

const INTERNATIONAL_COUNTRIES = [
  {
    country: "Uganda",
    timeZone: "Africa/Kampala",
    languages: ["English", "Luganda", "Swahili"],
    maleNames: ["Denis", "Brian", "Joseph", "Samuel", "Patrick"],
    femaleNames: ["Grace", "Faith", "Sarah", "Peace", "Esther"],
    lastNames: ["Kato", "Mukasa", "Namubiru", "Kigozi", "Okello"],
  },
  {
    country: "Kenya",
    timeZone: "Africa/Nairobi",
    languages: ["English", "Swahili"],
    maleNames: ["Kevin", "Evans", "John", "David", "Peter"],
    femaleNames: ["Mercy", "Faith", "Joy", "Sharon", "Brenda"],
    lastNames: ["Mwangi", "Kipchoge", "Otieno", "Kimani", "Ochieng"],
  },
  {
    country: "Nigeria",
    timeZone: "Africa/Lagos",
    languages: ["English", "French"],
    maleNames: ["Emeka", "Chidi", "Tunde", "Femi", "Ibrahim"],
    femaleNames: ["Chioma", "Amina", "Zainab", "Ngozi", "Blessing"],
    lastNames: ["Adeyemi", "Okonkwo", "Okafor", "Balogun", "Bello"],
  },
  {
    country: "Tanzania",
    timeZone: "Africa/Dar_es_Salaam",
    languages: ["English", "Swahili", "Arabic"],
    maleNames: ["Rashid", "Hamisi", "Baraka", "Juma"],
    femaleNames: ["Amina", "Zuhura", "Rehema", "Neema"],
    lastNames: ["Mollel", "Makamba", "Massawe", "Mrema"],
  },
  {
    country: "Zambia",
    timeZone: "Africa/Lusaka",
    languages: ["English"],
    maleNames: ["Chileshe", "Musonda", "Kabwe", "Bwalya"],
    femaleNames: ["Chipo", "Mutale", "Natasha", "Mwamba"],
    lastNames: ["Banda", "Phiri", "Tembo", "Lungu"],
  },
  {
    country: "Ghana",
    timeZone: "Africa/Accra",
    languages: ["English", "French"],
    maleNames: ["Kwame", "Kofi", "Yaw", "Kwabena"],
    femaleNames: ["Akua", "Abena", "Afia", "Yaa"],
    lastNames: ["Mensah", "Osei", "Appiah", "Boateng"],
  },
  {
    country: "Nepal",
    timeZone: "Asia/Kathmandu",
    languages: ["Nepali", "Hindi", "English"],
    maleNames: ["Aarav", "Bibek", "Suman", "Prashant", "Roshan"],
    femaleNames: ["Sita", "Puja", "Anjali", "Sushma", "Alisha"],
    lastNames: ["Thapa", "Shrestha", "Adhikari", "Gurung", "Bhandari"],
  },
  {
    country: "Bangladesh",
    timeZone: "Asia/Dhaka",
    languages: ["Bengali", "English"],
    maleNames: ["Tanvir", "Siam", "Shakib", "Naim", "Fahim"],
    femaleNames: ["Nusrat", "Tasnim", "Farzana", "Ayesha", "Lamia"],
    lastNames: ["Hossain", "Rahman", "Ahmed", "Islam", "Chowdhury"],
  },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function runSeed() {
  console.log("[Seed Students] Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("[Seed Students] Connected successfully.");

  // HANDLE RESET
  if (isReset) {
    console.log("[Seed Students] '--reset' flag detected. Locating demo student accounts...");
    const demoUsers = await User.find({ isDemo: true }).select("_id email registrationNumber");
    const demoIds = demoUsers.map((u) => u._id);

    if (demoIds.length === 0) {
      console.log("[Seed Students] No demo students found in database. Nothing to delete.");
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`[Seed Students] Found ${demoIds.length} demo students. Deleting associated profiles and preferences...`);
    const profRes = await StudentProfile.deleteMany({ user: { $in: demoIds } });
    const prefRes = await Preference.deleteMany({ student: { $in: demoIds } });
    const userRes = await User.deleteMany({ _id: { $in: demoIds } });

    console.log("\n========================================================");
    console.log("            DEMO DATA CLEANUP COMPLETED");
    console.log("========================================================");
    console.log(`Demo Users Deleted       : ${userRes.deletedCount}`);
    console.log(`Profiles Deleted         : ${profRes.deletedCount}`);
    console.log(`Preferences Deleted      : ${prefRes.deletedCount}`);
    console.log("Note: Real student and admin accounts were strictly untouched.");
    console.log("========================================================\n");

    await mongoose.disconnect();
    process.exit(0);
  }

  // HANDLE SEED CREATION
  console.log(`[Seed Students] Target demo student count: ${targetCount}`);
  console.log("[Seed Students] Hashing demo student password once for optimal speed...");
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  console.log("[Seed Students] Password hash generated.");

  // Fetch existing demo registrations to prevent duplicates
  const existingDemoUsers = await User.find({ isDemo: true }).select("registrationNumber");
  const existingRegs = new Set(existingDemoUsers.map((u) => u.registrationNumber));
  console.log(`[Seed Students] Found ${existingRegs.size} existing demo students in database.`);

  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 1; i <= targetCount; i++) {
    const regNo = `DEMO-${String(i).padStart(4, "0")}`;
    if (existingRegs.has(regNo)) {
      skippedCount++;
      continue;
    }

    // Gender: ~60% male, ~40% female
    const isMale = Math.random() < 0.6;
    const gender = isMale ? "male" : "female";

    // International: ~8% probability
    const isInternational = Math.random() < 0.08;

    let firstName, lastName, fullName, homeCountry, homeState, homeTimeZone, arrivalDate, languages;

    if (isInternational) {
      const countryConfig = pickRandom(INTERNATIONAL_COUNTRIES);
      homeCountry = countryConfig.country;
      homeState = "";
      homeTimeZone = countryConfig.timeZone;
      firstName = isMale ? pickRandom(countryConfig.maleNames) : pickRandom(countryConfig.femaleNames);
      lastName = pickRandom(countryConfig.lastNames);
      fullName = `${firstName} ${lastName}`;
      languages = [...countryConfig.languages];
      // Arrival date in Aug / Sept 2026
      const day = randomInt(10, 31);
      arrivalDate = new Date(`2026-08-${String(day).padStart(2, "0")}T10:00:00.000Z`);
    } else {
      homeCountry = "India";
      const region = pickRandom(INDIAN_REGIONS);
      homeState = region.state;
      homeTimeZone = "Asia/Kolkata";
      arrivalDate = null;
      firstName = isMale ? pickRandom(INDIAN_MALE_FIRST_NAMES) : pickRandom(INDIAN_FEMALE_FIRST_NAMES);
      lastName = pickRandom(INDIAN_LAST_NAMES);
      fullName = `${firstName} ${lastName}`;
      languages = [...region.languages];
    }

    const academic = pickRandom(ACADEMIC_PROGRAMS);
    const academicYear = randomInt(1, 4);
    const emailNum = String(i).padStart(4, "0");
    const email = `demo${emailNum}@demo.hostelmatch.local`;
    const phone = `+91 ${randomInt(70000, 99999)} ${randomInt(10000, 99999)}`;

    // Create User record
    const userDoc = await User.create({
      name: fullName,
      email,
      password: hashedPassword,
      role: "student",
      gender,
      registrationNumber: regNo,
      phone,
      course: academic.course,
      department: academic.department,
      year: academicYear,
      isActive: true,
      isDemo: true,
    });

    // Create StudentProfile
    const isProfileDone = Math.random() < 0.92;
    await StudentProfile.create({
      user: userDoc._id,
      homeCountry,
      homeState,
      isInternational,
      homeTimeZone,
      arrivalDate,
      emergencyContactName: `${pickRandom(INDIAN_LAST_NAMES)} Contact`,
      emergencyContactPhone: `+91 9${randomInt(100000000, 999999999)}`,
      profileCompletedAt: isProfileDone ? new Date() : null,
    });

    // Generate Preferences
    // ~85% completed, ~15% incomplete
    const isPrefCompleted = Math.random() < 0.85;

    if (isPrefCompleted) {
      // Correlated, realistic lifestyle habits
      const sleepRand = Math.random();
      const sleepSchedule = sleepRand < 0.3 ? "early" : sleepRand < 0.75 ? "normal" : "late";

      let studyTime;
      if (sleepSchedule === "late") {
        studyTime = Math.random() < 0.65 ? "night" : Math.random() < 0.85 ? "flexible" : "daytime";
      } else if (sleepSchedule === "early") {
        studyTime = Math.random() < 0.7 ? "morning" : Math.random() < 0.9 ? "daytime" : "flexible";
      } else {
        studyTime = pickRandom(["morning", "daytime", "night", "flexible"]);
      }

      // Night calls: International students call home more often at night
      let nightCalls;
      if (isInternational) {
        nightCalls = Math.random() < 0.65 ? "often" : Math.random() < 0.9 ? "sometimes" : "never";
      } else {
        nightCalls = Math.random() < 0.2 ? "often" : Math.random() < 0.65 ? "sometimes" : "never";
      }

      const cleanliness = randomInt(2, 5);
      const noiseTolerance = randomInt(1, 5);
      const socialLevel = randomInt(1, 5);
      const acPreference = pickRandom(["ac", "non-ac", "no-preference"]);

      // Food type distribution
      const foodRand = Math.random();
      let foodType;
      if (foodRand < 0.42) foodType = "veg";
      else if (foodRand < 0.78) foodType = "non-veg";
      else if (foodRand < 0.88) foodType = "eggetarian";
      else if (foodRand < 0.94) foodType = "halal";
      else foodType = "jain";

      // Food sharing comfort
      let okWithDifferentFood;
      if (foodType === "jain") {
        okWithDifferentFood = Math.random() < 0.2;
      } else if (foodType === "veg" || foodType === "halal") {
        okWithDifferentFood = Math.random() < 0.5;
      } else {
        okWithDifferentFood = Math.random() < 0.9;
      }

      const culturalComfort = pickRandom([
        "open-to-all",
        "open-to-all",
        "prefer-similar-background",
        "no-preference",
      ]);

      // Deal-breakers selection based on preferences
      const dealBreakers = [];
      if ((foodType === "jain" || foodType === "veg") && !okWithDifferentFood && Math.random() < 0.7) {
        dealBreakers.push("food");
      }
      if (cleanliness >= 4 && Math.random() < 0.4) {
        dealBreakers.push("cleanliness");
      }
      if (noiseTolerance <= 2 && Math.random() < 0.5) {
        dealBreakers.push("lateNightNoise");
      }
      if (socialLevel <= 2 && Math.random() < 0.4) {
        dealBreakers.push("visitors");
      }
      if (acPreference !== "no-preference" && Math.random() < 0.35) {
        dealBreakers.push("acType");
      }

      await Preference.create({
        student: userDoc._id,
        sleepSchedule,
        studyTime,
        nightCalls,
        cleanliness,
        noiseTolerance,
        socialLevel,
        acPreference,
        foodType,
        okWithDifferentFood,
        languages,
        culturalComfort,
        dealBreakers,
        completedAt: new Date(),
        version: 1,
      });
    } else {
      // Incomplete questionnaire (partial or null)
      await Preference.create({
        student: userDoc._id,
        sleepSchedule: Math.random() < 0.5 ? "normal" : null,
        cleanliness: 3,
        languages: ["English"],
        completedAt: null, // PENDING!
        version: 1,
      });
    }

    createdCount++;
    if (createdCount % 50 === 0 || createdCount === targetCount) {
      console.log(`  └─ Progress: ${createdCount} / ${targetCount} students seeded...`);
    }
  }

  console.log("\n========================================================");
  console.log("            DEMO STUDENT SEED COMPLETED");
  console.log("========================================================");
  console.log(`Demo Students Created : ${createdCount}`);
  console.log(`Demo Students Skipped : ${skippedCount} (already existing)`);
  console.log(`Login Password for all: ${DEMO_PASSWORD}`);
  console.log("Example Accounts:");
  console.log("  1) demo0001@demo.hostelmatch.local");
  console.log("  2) demo0002@demo.hostelmatch.local");
  console.log("  3) demo0003@demo.hostelmatch.local");
  console.log("========================================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

runSeed().catch(async (err) => {
  console.error("[Seed Students Error]:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
