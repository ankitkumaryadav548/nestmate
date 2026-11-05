#!/usr/bin/env node
/**
 * scripts/rename-hostels.js
 *
 * Migration script: Removes "Block" from all Boys and Girls Hostel names in MongoDB.
 * Example:
 *   "Boys Hostel Block 10" -> "Boys Hostel 10"
 *   "Girls Hostel Block 3"  -> "Girls Hostel 3"
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   node scripts/rename-hostels.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI not found in environment.");
  process.exit(1);
}

async function run() {
  console.log("==================================================================");
  console.log("  HOSTELMATCH DATABASE MIGRATION: RENAME HOSTELS (REMOVE 'BLOCK')");
  console.log("==================================================================");

  await mongoose.connect(MONGODB_URI);
  console.log(" Connected to MongoDB.");

  const Hostel = mongoose.models.Hostel || mongoose.model(
    "Hostel",
    new mongoose.Schema({}, { strict: false })
  );

  const hostels = await Hostel.find({}).lean();
  console.log(` Found ${hostels.length} total hostels in database.\n`);

  let renamedCount = 0;

  for (const h of hostels) {
    if (/Block/i.test(h.name)) {
      // Remove "Block" and any trailing/leading spaces around it
      // e.g. "Boys Hostel Block 10" -> "Boys Hostel 10"
      const newName = h.name.replace(/\s*Block\s*/gi, " ").trim();
      await Hostel.updateOne({ _id: h._id }, { $set: { name: newName } });
      console.log(` Renamed: "${h.name}" (${h.code}) -> "${newName}"`);
      renamedCount++;
    } else {
      console.log(` Unchanged: "${h.name}" (${h.code})`);
    }
  }

  console.log(`\n Successfully updated ${renamedCount} hostel(s).`);
  await mongoose.disconnect();
  console.log(" Disconnected from MongoDB. Complete.");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

