#!/usr/bin/env node
/**
 * scripts/test-publish-rollback.js
 * 
 * Self-contained end-to-end database verification test for:
 * 1. Draft simulation generation (persisted)
 * 2. Atomic Publication with MongoDB transaction
 * 3. Integrity verification of published state
 * 4. "My Room" service API verification for allocated students
 * 5. Atomic Rollback of published run
 * 6. Verification of exact state restoration & post-rollback integrity
 * 
 * Run:
 *   npm run test:publish
 *   npm run test:publish -- --force
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
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

async function runTest() {
  const isForce = process.argv.includes("--force");

  console.log("==================================================================");
  console.log("  HOSTELMATCH END-TO-END PUBLISH & ROLLBACK VERIFICATION");
  console.log("==================================================================");

  const connectDB = (await import("../src/lib/db.js")).default;
  const User = (await import("../src/models/User.js")).default;
  const Room = (await import("../src/models/Room.js")).default;
  const RoommateGroup = (await import("../src/models/RoommateGroup.js")).default;
  const AllocationRun = (await import("../src/models/AllocationRun.js")).default;
  const AllocationAssignment = (await import("../src/models/AllocationAssignment.js")).default;
  const Allocation = (await import("../src/models/Allocation.js")).default;
  const { runAllocation } = await import("../src/services/allocationService.js");
  const { publishRun, rollbackRun } = await import("../src/services/publishService.js");
  const { getMyAllocation } = await import("../src/services/studentAllocationService.js");
  const { checkIntegrity } = await import("../src/services/integrityService.js");

  await connectDB();

  // Safety check: Refuse if there is already an active published run
  const existingPublished = await AllocationRun.findOne({ status: "published" }).lean();
  if (existingPublished && !isForce) {
    console.error("❌ REFUSING TO RUN: A published allocation run already exists in the database.");
    console.error(`   Existing published run ID: ${existingPublished._id}`);
    console.error("   Pass '--force' if you explicitly wish to test over existing data.");
    await mongoose.disconnect();
    process.exit(1);
  }

  // Find admin user for audit trail
  const adminUser = await User.findOne({ role: "admin" }).lean();
  const adminId = adminUser ? String(adminUser._id) : new mongoose.Types.ObjectId().toString();

  const results = [];
  function record(stepName, passed, details = "") {
    results.push({ stepName, passed, details });
    const mark = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`[${mark}] ${stepName} ${details ? `(${details})` : ""}`);
  }

  let testRunId = null;

  try {
    // ------------------------------------------------------------------------
    // STEP 1: Baseline state snapshot & initial integrity
    // ------------------------------------------------------------------------
    console.log("\n--> STEP 1: Capturing baseline snapshots and pre-check integrity...");
    const initialIntegrity = await checkIntegrity();
    record("Step 1.1: Pre-run integrity check is clean", initialIntegrity.isClean);

    const roomsBaseline = await Room.find().select("currentOccupancy status").lean();
    const baselineOccupancySum = roomsBaseline.reduce((acc, r) => acc + (r.currentOccupancy || 0), 0);
    const groupsBaseline = await RoommateGroup.find().select("status members targetSize").lean();
    const baselineGroupStatusCounts = {};
    groupsBaseline.forEach((g) => {
      baselineGroupStatusCounts[g.status] = (baselineGroupStatusCounts[g.status] || 0) + 1;
    });

    console.log(`    Baseline room occupancy sum: ${baselineOccupancySum}`);
    console.log(`    Baseline groups count: ${groupsBaseline.length} (forming: ${baselineGroupStatusCounts.forming || 0}, complete: ${baselineGroupStatusCounts.complete || 0})`);

    // ------------------------------------------------------------------------
    // STEP 2: Run simulation (persisted draft)
    // ------------------------------------------------------------------------
    console.log("\n--> STEP 2: Running allocation simulation with persistence...");
    const simResult = await runAllocation(null, { seed: 888 }, { persist: true });
    testRunId = simResult.runId;
    const draftRun = await AllocationRun.findById(testRunId).lean();
    const assignmentsCount = await AllocationAssignment.countDocuments({ run: testRunId });
    
    record("Step 2.1: Simulation draft persisted", draftRun && draftRun.status === "draft", `RunId: ${testRunId}`);
    record("Step 2.2: Draft assignments created", assignmentsCount > 0, `${assignmentsCount} assignments`);

    // ------------------------------------------------------------------------
    // STEP 3: Publish the draft run atomically
    // ------------------------------------------------------------------------
    console.log("\n--> STEP 3: Publishing the draft run atomically...");
    const pubResult = await publishRun(adminId, testRunId, { confirmText: "PUBLISH" });
    const publishedRun = await AllocationRun.findById(testRunId).lean();

    record("Step 3.1: publishRun succeeded", Boolean(pubResult.success));
    record("Step 3.2: AllocationRun status is 'published'", publishedRun.status === "published");
    record("Step 3.3: Publish snapshot saved", Boolean(publishedRun.publishSnapshot && publishedRun.publishSnapshot.allocationIds?.length > 0), `${publishedRun.publishSnapshot?.allocationIds?.length} allocations`);

    // ------------------------------------------------------------------------
    // STEP 4: Integrity check on published state
    // ------------------------------------------------------------------------
    console.log("\n--> STEP 4: Checking system integrity on published state...");
    const pubIntegrity = await checkIntegrity();
    record("Step 4.1: Post-publish integrity is 100% clean", pubIntegrity.isClean, pubIntegrity.isClean ? "0 anomalies" : `${pubIntegrity.problems.length} problems`);
    if (!pubIntegrity.isClean) {
      console.warn("Integrity problems found:", pubIntegrity.problems);
    }

    // ------------------------------------------------------------------------
    // STEP 5: Invariant & Student "My Room" verification
    // ------------------------------------------------------------------------
    console.log("\n--> STEP 5: Verifying student room residency and privacy invariants...");
    const activeAllocations = await Allocation.find({ run: testRunId, status: "active" }).lean();
    record("Step 5.1: Active Allocation records exist", activeAllocations.length > 0, `${activeAllocations.length} records`);

    // Verify no duplicate active allocations for any student
    const studentAllocCount = new Map();
    for (const a of activeAllocations) {
      const sId = String(a.student);
      studentAllocCount.set(sId, (studentAllocCount.get(sId) || 0) + 1);
    }
    const hasDuplicates = Array.from(studentAllocCount.values()).some((c) => c > 1);
    record("Step 5.2: Invariant: Zero duplicate active allocations", !hasDuplicates);

    // Verify /api/allocation/me-equivalent service for sample allocated students
    const sampleAlloc = activeAllocations[0];
    const studentRoomData = await getMyAllocation(sampleAlloc.student);
    const hasExpectedStatus = studentRoomData && studentRoomData.status === "allocated";
    const hasHostelAndRoom = studentRoomData?.hostel?.name && studentRoomData?.room?.roomNumber;
    
    // Privacy verification: Check that roommates list never exposes confidential fields
    let privacyRespected = true;
    if (studentRoomData?.roommates?.length > 0) {
      for (const rm of studentRoomData.roommates) {
        if (rm.email || rm.registrationNumber || rm.preferences || rm.dealBreakers || rm.homeState || rm.homeCountry) {
          privacyRespected = false;
        }
      }
    }

    record("Step 5.3: getMyAllocation returns allocated status", hasExpectedStatus);
    record("Step 5.4: Student sees hostel and room details", Boolean(hasHostelAndRoom));
    record("Step 5.5: Privacy Invariant: Roommate confidential fields stripped", privacyRespected);

    // ------------------------------------------------------------------------
    // STEP 6: Rollback the published run
    // ------------------------------------------------------------------------
    console.log("\n--> STEP 6: Executing atomic rollback of the published run...");
    const rollResult = await rollbackRun(adminId, testRunId, { confirmText: "ROLLBACK" });
    const rolledBackRun = await AllocationRun.findById(testRunId).lean();

    record("Step 6.1: rollbackRun succeeded", Boolean(rollResult.success));
    record("Step 6.2: AllocationRun status is 'rolled_back'", rolledBackRun.status === "rolled_back");

    // ------------------------------------------------------------------------
    // STEP 7: Verify state restored to baseline
    // ------------------------------------------------------------------------
    console.log("\n--> STEP 7: Verifying complete restoration of baseline state...");
    
    // 7.1 Verify active allocations are cancelled
    const remainingActiveAllocations = await Allocation.countDocuments({ run: testRunId, status: "active" });
    record("Step 7.1: Zero active allocations remain for rolled back run", remainingActiveAllocations === 0);

    // 7.2 Verify room occupancies equal baseline
    const roomsPostRollback = await Room.find().select("currentOccupancy status").lean();
    const rollbackOccupancySum = roomsPostRollback.reduce((acc, r) => acc + (r.currentOccupancy || 0), 0);
    record("Step 7.2: Room occupancies restored to exact baseline", rollbackOccupancySum === baselineOccupancySum, `Occupancy: ${rollbackOccupancySum}`);

    // 7.3 Verify groups restored
    const groupsPostRollback = await RoommateGroup.find().select("status members targetSize").lean();
    const lockedGroupsPost = groupsPostRollback.filter((g) => g.status === "locked").length;
    record("Step 7.3: Groups restored / zero orphaned locked groups", lockedGroupsPost === 0);

    // 7.4 Verify student now sees 'pending' (no longer allocated)
    const studentRoomDataAfter = await getMyAllocation(sampleAlloc.student);
    record("Step 7.4: Student status returns to 'pending' after rollback", studentRoomDataAfter?.status === "pending" || studentRoomDataAfter?.status === "not_allocated");

    // 7.5 Post-rollback integrity check
    const postRollbackIntegrity = await checkIntegrity();
    record("Step 7.5: Post-rollback integrity is 100% clean", postRollbackIntegrity.isClean);

  } catch (err) {
    console.error("\n❌ FATAL TEST EXCEPTION:", err);
    record("Exception free execution", false, err.message);
  } finally {
    // Clean up test run artifacts
    if (testRunId) {
      console.log(`\n--> Cleaning up test run (${testRunId})...`);
      await AllocationAssignment.deleteMany({ run: testRunId });
      await Allocation.deleteMany({ run: testRunId });
      await AllocationRun.deleteOne({ _id: testRunId });
    }
  }

  console.log("\n==================================================================");
  console.log("  TEST SUMMARY RESULTS");
  console.log("==================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  results.forEach((r) => {
    const mark = r.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${mark} - ${r.stepName} ${r.details ? `[${r.details}]` : ""}`);
  });

  console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log("==================================================================");

  await mongoose.disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

runTest();
