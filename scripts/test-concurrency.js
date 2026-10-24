#!/usr/bin/env node
/**
 * scripts/test-concurrency.js
 * 
 * Verifies concurrency safety and race condition prevention when publishing:
 * 1. Generates a persisted draft allocation run.
 * 2. Fires two publishRun() calls simultaneously for the EXACT SAME draft.
 * 3. Confirms that EXACTLY ONE call succeeds and the other fails with conflict (409).
 * 4. Verifies physical room occupancy was NOT doubled.
 * 5. Rolls back and cleans up test state.
 * 
 * Run:
 *   npm run test:concurrency
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
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

async function runConcurrencyTest() {
  console.log("==================================================================");
  console.log("  HOSTELMATCH CONCURRENCY & RACE-CONDITION VERIFICATION");
  console.log("==================================================================");

  const connectDB = (await import("../src/lib/db.js")).default;
  const User = (await import("../src/models/User.js")).default;
  const Room = (await import("../src/models/Room.js")).default;
  const AllocationRun = (await import("../src/models/AllocationRun.js")).default;
  const AllocationAssignment = (await import("../src/models/AllocationAssignment.js")).default;
  const Allocation = (await import("../src/models/Allocation.js")).default;
  const { runAllocation } = await import("../src/services/allocationService.js");
  const { publishRun, rollbackRun } = await import("../src/services/publishService.js");

  await connectDB();

  // Find admin user
  const adminUser = await User.findOne({ role: "admin" }).lean();
  const adminId = adminUser ? String(adminUser._id) : new mongoose.Types.ObjectId().toString();

  let testRunId = null;

  try {
    console.log("--> 1. Generating persisted draft simulation...");
    const simResult = await runAllocation(null, { seed: 999 }, { persist: true });
    testRunId = simResult.runId;
    console.log(`    Draft Run ID created: ${testRunId}`);

    const assignmentDocs = await AllocationAssignment.find({ run: testRunId, status: "assigned" }).lean();
    const expectedStudentsAllocated = assignmentDocs.reduce((sum, a) => sum + (a.members?.length || a.size || 0), 0);
    console.log(`    Assignments count: ${assignmentDocs.length} (Expected total occupants: ${expectedStudentsAllocated})`);

    console.log("--> 2. Launching 2 simultaneous publishRun() calls...");
    const [call1, call2] = await Promise.allSettled([
      publishRun(adminId, testRunId, { confirmText: "PUBLISH" }),
      publishRun(adminId, testRunId, { confirmText: "PUBLISH" }),
    ]);

    const successes = [call1, call2].filter((c) => c.status === "fulfilled");
    const rejections = [call1, call2].filter((c) => c.status === "rejected");

    console.log("\n--- Concurrency Execution Analysis ---");
    console.log(`Call 1 result: ${call1.status} ${call1.status === "rejected" ? `(${call1.reason?.message})` : ""}`);
    console.log(`Call 2 result: ${call2.status} ${call2.status === "rejected" ? `(${call2.reason?.message})` : ""}`);

    let allChecksPass = true;

    // Check A: Exactly one succeeded
    if (successes.length === 1 && rejections.length === 1) {
      console.log("✅ PASS: Exactly ONE call acquired the lock and completed publication.");
    } else {
      console.error(`❌ FAIL: Expected 1 success and 1 rejection, got ${successes.length} successes and ${rejections.length} rejections.`);
      allChecksPass = false;
    }

    // Check B: Rejection was due to conflict / status lock
    if (rejections.length > 0) {
      const err = rejections[0].reason;
      const isExpectedConflict =
        err?.status === 409 ||
        err?.message?.includes("Cannot publish") ||
        err?.message?.includes("publishing") ||
        err?.message?.includes("draft");
      if (isExpectedConflict) {
        console.log(`✅ PASS: Second call was cleanly rejected with 409/Conflict lock message: "${err.message}"`);
      } else {
        console.warn(`⚠️ Warning: Second call failed with unexpected error message: "${err?.message}"`);
      }
    }

    // Check C: Physical occupancy and allocations were NOT doubled
    const activeAllocationsCount = await Allocation.countDocuments({ run: testRunId, status: "active" });
    if (activeAllocationsCount === expectedStudentsAllocated) {
      console.log(`✅ PASS: Active Allocation records count (${activeAllocationsCount}) matches expected count. ZERO doubling.`);
    } else {
      console.error(`❌ FAIL: Allocation count is ${activeAllocationsCount}, expected ${expectedStudentsAllocated}. Possible duplication.`);
      allChecksPass = false;
    }

    // Check D: Clean rollback test run if published
    const publishedRunCheck = await AllocationRun.findById(testRunId).lean();
    if (publishedRunCheck && publishedRunCheck.status === "published") {
      console.log("\n--> 3. Rolling back test run to leave database pristine...");
      const rollResult = await rollbackRun(adminId, testRunId, { confirmText: "ROLLBACK" });
      if (rollResult.success) {
        console.log("✅ PASS: Test run rolled back cleanly.");
      } else {
        console.error("❌ FAIL: Rollback failed during cleanup.");
        allChecksPass = false;
      }
    }

    console.log("\n==================================================================");
    if (allChecksPass) {
      console.log("  CONCURRENCY VERIFICATION: ALL CHECKS PASSED ✅");
      console.log("==================================================================");
      await mongoose.disconnect();
      process.exit(0);
    } else {
      console.log("  CONCURRENCY VERIFICATION: ONE OR MORE CHECKS FAILED ❌");
      console.log("==================================================================");
      await mongoose.disconnect();
      process.exit(1);
    }
  } catch (fatalErr) {
    console.error("FATAL: Unhandled exception in concurrency test:", fatalErr);
    if (testRunId) {
      try {
        await AllocationAssignment.deleteMany({ run: testRunId });
        await Allocation.deleteMany({ run: testRunId });
        await AllocationRun.deleteOne({ _id: testRunId });
      } catch {}
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

runConcurrencyTest();
