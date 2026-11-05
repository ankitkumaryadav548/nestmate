/**
 * Migration Script: Backfill Bed Numbers for Single-Room Allocations
 *
 * Sets bedNumber = 1 for existing active allocations in capacity 1 rooms.
 * Idempotent: safe to run multiple times without causing duplicates or errors.
 *
 * Usage:
 *   npm run backfill:beds
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) {
    console.error("[Backfill Beds] Error: .env.local file not found.");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function run() {
  loadEnv();

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("[Backfill Beds] Error: MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log("[Backfill Beds] Connected to MongoDB.");

  const Allocation = mongoose.models.Allocation || mongoose.model(
    "Allocation",
    new mongoose.Schema({}, { strict: false })
  );
  const Room = mongoose.models.Room || mongoose.model(
    "Room",
    new mongoose.Schema({}, { strict: false })
  );

  // Find all active allocations without a bedNumber
  const activeAllocations = await Allocation.find({
    status: "active",
    $or: [{ bedNumber: null }, { bedNumber: { $exists: false } }],
  }).lean();

  console.log(`[Backfill Beds] Found ${activeAllocations.length} active allocations without bedNumber.`);

  let updatedCount = 0;
  for (const alloc of activeAllocations) {
    if (!alloc.room) continue;
    const roomDoc = await Room.findById(alloc.room).select("capacity").lean();
    if (roomDoc && roomDoc.capacity === 1) {
      await Allocation.updateOne(
        { _id: alloc._id },
        { $set: { bedNumber: 1 } }
      );
      updatedCount++;
    }
  }

  console.log(`[Backfill Beds] Successfully backfilled bedNumber = 1 for ${updatedCount} single-room allocation(s).`);
  await mongoose.disconnect();
  console.log("[Backfill Beds] Disconnected from MongoDB. Complete.");
}

run().catch((err) => {
  console.error("[Backfill Beds] Fatal error:", err);
  process.exit(1);
});

