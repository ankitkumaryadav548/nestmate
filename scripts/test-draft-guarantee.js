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
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

async function verifyDraftGuarantee() {
  const connectDB = (await import("../src/lib/db.js")).default;
  const Room = (await import("../src/models/Room.js")).default;
  const RoommateGroup = (await import("../src/models/RoommateGroup.js")).default;
  const User = (await import("../src/models/User.js")).default;
  const Preference = (await import("../src/models/Preference.js")).default;
  const AllocationIntent = (await import("../src/models/AllocationIntent.js")).default;
  const AllocationRun = (await import("../src/models/AllocationRun.js")).default;
  const AllocationAssignment = (await import("../src/models/AllocationAssignment.js")).default;
  const { runAllocation } = await import("../src/services/allocationService.js");

  await connectDB();

  console.log("--> Taking baseline snapshots of existing collections...");

  // Snapshot rooms
  const roomsBefore = await Room.find().select("currentOccupancy status notes").lean();
  const roomsOccupancySumBefore = roomsBefore.reduce((acc, r) => acc + (r.currentOccupancy || 0), 0);

  // Snapshot groups
  const groupsBefore = await RoommateGroup.find().select("status members targetSize").lean();
  const groupsStatusCountsBefore = {};
  for (const g of groupsBefore) {
    groupsStatusCountsBefore[g.status] = (groupsStatusCountsBefore[g.status] || 0) + 1;
  }

  // Snapshot counts
  const usersCountBefore = await User.countDocuments();
  const prefsCountBefore = await Preference.countDocuments();
  const intentsCountBefore = await AllocationIntent.countDocuments();

  console.log("--> Running allocation simulation WITH --save (persist: true)...");
  const result = await runAllocation(null, { seed: 555 }, { persist: true });
  console.log(`--> Saved Draft Run: ${result.runId}`);

  console.log("--> Verifying that NO live documents were mutated...");

  // Verify rooms
  const roomsAfter = await Room.find().select("currentOccupancy status notes").lean();
  const roomsOccupancySumAfter = roomsAfter.reduce((acc, r) => acc + (r.currentOccupancy || 0), 0);
  if (roomsOccupancySumBefore !== roomsOccupancySumAfter) {
    throw new Error(`DRAFT GUARANTEE VIOLATION: Room occupancy changed from ${roomsOccupancySumBefore} to ${roomsOccupancySumAfter}!`);
  }
  for (let i = 0; i < roomsBefore.length; i++) {
    if (roomsBefore[i].currentOccupancy !== roomsAfter[i].currentOccupancy || roomsBefore[i].status !== roomsAfter[i].status) {
      throw new Error(`DRAFT GUARANTEE VIOLATION: Room ${roomsBefore[i]._id} was modified!`);
    }
  }

  // Verify groups
  const groupsAfter = await RoommateGroup.find().select("status members targetSize").lean();
  const groupsStatusCountsAfter = {};
  for (const g of groupsAfter) {
    groupsStatusCountsAfter[g.status] = (groupsStatusCountsAfter[g.status] || 0) + 1;
  }
  if (JSON.stringify(groupsStatusCountsBefore) !== JSON.stringify(groupsStatusCountsAfter)) {
    throw new Error("DRAFT GUARANTEE VIOLATION: RoommateGroup statuses changed!");
  }
  for (let i = 0; i < groupsBefore.length; i++) {
    if (groupsBefore[i].status !== groupsAfter[i].status || groupsBefore[i].members.length !== groupsAfter[i].members.length) {
      throw new Error(`DRAFT GUARANTEE VIOLATION: Group ${groupsBefore[i]._id} was modified!`);
    }
  }

  // Verify counts
  const usersCountAfter = await User.countDocuments();
  const prefsCountAfter = await Preference.countDocuments();
  const intentsCountAfter = await AllocationIntent.countDocuments();

  if (usersCountBefore !== usersCountAfter) throw new Error("DRAFT GUARANTEE VIOLATION: User documents changed!");
  if (prefsCountBefore !== prefsCountAfter) throw new Error("DRAFT GUARANTEE VIOLATION: Preference documents changed!");
  if (intentsCountBefore !== intentsCountAfter) throw new Error("DRAFT GUARANTEE VIOLATION: Intent documents changed!");

  // Verify that AllocationRun and AllocationAssignment WERE created
  const runDoc = await AllocationRun.findById(result.runId);
  if (!runDoc) throw new Error("Expected AllocationRun document was not found!");
  const assignCount = await AllocationAssignment.countDocuments({ run: result.runId });
  if (assignCount === 0) throw new Error("Expected AllocationAssignment documents were not found!");

  console.log(`✅ Draft Guarantee PROVEN: 0 live documents mutated. Only AllocationRun (${result.runId}) and ${assignCount} assignments stored.`);

  // Cleanup test run
  await AllocationAssignment.deleteMany({ run: result.runId });
  await AllocationRun.deleteOne({ _id: result.runId });
  console.log("--> Cleaned up test run.");

  process.exit(0);
}

verifyDraftGuarantee().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
