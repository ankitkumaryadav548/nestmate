const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * Parses and loads .env.local into process.env if not already present.
 */
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Seed Admin] Error: .env.local file not found.");
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
const ADMIN_NAME = process.env.ADMIN_NAME || "System Administrator";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@hostelmatch.edu").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AdminPassword123!";

if (!MONGODB_URI) {
  console.error("[Seed Admin] Error: MONGODB_URI is missing in .env.local");
  process.exit(1);
}

// User schema for the seed script
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
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function seedAdmin() {
  console.log(`[Seed Admin] Connecting to MongoDB...`);
  try {
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    console.log(`[Seed Admin] Connected to database.`);

    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log(`[Seed Admin] Admin already exists with email: "${ADMIN_EMAIL}". Skipping creation.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`[Seed Admin] Creating admin user "${ADMIN_NAME}" (${ADMIN_EMAIL})...`);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const newAdmin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    console.log(`[Seed Admin] SUCCESS! Admin created with ID: ${newAdmin._id}`);
    console.log(`[Seed Admin] Email: ${ADMIN_EMAIL}`);
    console.log(`[Seed Admin] Role: admin`);
    console.log(`[Seed Admin] You can now log in at /login with these admin credentials.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("[Seed Admin Error]", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seedAdmin();
