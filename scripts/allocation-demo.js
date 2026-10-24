/**
 * Hostel Allocation Engine Console Demo Script (Phase 5 - Simulation Mode)
 * 
 * Usage:
 *   node scripts/allocation-demo.js [--seed=42] [--gender=all] [--priority=lottery] [--save]
 *   npm run allocation:demo -- --seed=42 --gender=all --priority=lottery
 * 
 * Flags:
 *   --seed=<number|string>   Deterministic random seed (e.g. 42)
 *   --gender=<all|male|female|other>
 *   --priority=<lottery|completedAt|seniority>
 *   --scope=<all|demo|real>
 *   --policy=<shrink|waitlist>
 *   --save                   Persists the run to MongoDB as a draft (default: dry run, writes NOTHING)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};
let shouldSave = false;

for (const arg of args) {
  if (arg === "--save") {
    shouldSave = true;
  } else if (arg.startsWith("--seed=")) {
    const val = arg.split("=")[1];
    options.seed = isNaN(val) ? val : Number(val);
  } else if (arg.startsWith("--gender=")) {
    options.gender = arg.split("=")[1];
  } else if (arg.startsWith("--priority=")) {
    options.priorityMode = arg.split("=")[1];
  } else if (arg.startsWith("--scope=")) {
    options.studentScope = arg.split("=")[1];
  } else if (arg.startsWith("--policy=")) {
    options.incompleteGroupPolicy = arg.split("=")[1];
  }
}

async function runDemo() {
  const { runAllocation } = await import("../src/services/allocationService.js");
  const { WAITLIST_REASONS, UNALLOCATED_REASONS } = await import("../src/config/allocation.js");

  console.log("\n================================================================================");
  console.log("       🏢 HOSTELMATCH AUTOMATED ALLOCATION ENGINE (SIMULATION DEMO) ⚡       ");
  console.log("================================================================================");

  console.log(`Execution Mode : ${shouldSave ? "💾 PERSIST DRAFT (Saved to Database)" : "🧪 PURE DRY-RUN (Zero DB writes)"}`);
  console.log(`Seed Applied   : ${options.seed ?? "Auto-generated"}`);
  console.log(`Priority Mode  : ${options.priorityMode || "lottery"}`);
  console.log(`Gender Scope   : ${options.gender || "all"}`);
  console.log(`Student Scope  : ${options.studentScope || "all"}`);
  console.log(`Group Policy   : ${options.incompleteGroupPolicy || "shrink"}`);
  console.log("--------------------------------------------------------------------------------");
  console.log("Running allocation algorithm and Monte Carlo baseline trials...");

  try {
    const result = await runAllocation(null, options, { persist: shouldSave });

    const stats = result.stats || {};
    const counts = stats.counts || {};
    const metrics = stats.metrics || {};
    const baseline = stats.baseline || {};
    const improvement = stats.improvement || {};
    const satisfaction = stats.satisfaction || {};
    const hostelUsage = stats.hostelUsage || [];

    console.log(`\n✅ Completed in ${stats.durationMs}ms with seed: [${result.options.seed}]`);

    console.log("\n📌 1. ALLOCATION SUMMARY");
    console.log("--------------------------------------------------------------------------------");
    console.log(`  • Students Allocated   : ${counts.studentsAllocated} students placed`);
    console.log(`  • Rooms Occupied       : ${counts.roomsUsed} rooms`);
    console.log(`  • Beds Filled          : ${counts.bedsFilled} beds`);
    console.log(`  • Groups Placed        : ${counts.unitsPlaced} units`);
    console.log(`      - Complete Groups  : ${counts.completeGroupsPlaced}`);
    console.log(`      - Filled Groups    : ${counts.formingGroupsFilled}`);
    console.log(`      - Shrunk Groups    : ${counts.shrunkGroupsPlaced}`);
    console.log(`      - Clustered Pool   : ${counts.poolGroupsPlaced}`);
    console.log(`  • Units Waitlisted     : ${counts.unitsWaitlisted} units (${counts.studentsWaitlisted} students)`);
    console.log(`  • Solo Unallocated     : ${counts.studentsUnallocated} students`);

    if (Object.keys(stats.waitlistReasonCounts || {}).length > 0) {
      console.log("\n⚠️  Waitlist Reasons Breakdown:");
      for (const [code, count] of Object.entries(stats.waitlistReasonCounts)) {
        const meta = WAITLIST_REASONS[code] || { label: code };
        console.log(`    - ${meta.label.padEnd(28)}: ${count} units`);
      }
    }

    if (result.unallocated.length > 0) {
      console.log("\n⚠️  Unallocated Students Reasons:");
      const unallocatedCounts = {};
      for (const u of result.unallocated) {
        unallocatedCounts[u.reason] = (unallocatedCounts[u.reason] || 0) + 1;
      }
      for (const [code, count] of Object.entries(unallocatedCounts)) {
        const meta = UNALLOCATED_REASONS[code] || { label: code };
        console.log(`    - ${meta.label.padEnd(28)}: ${count} students`);
      }
    }

    console.log("\n📌 2. PREFERENCE SATISFACTION (Soft Criteria Honor Rate)");
    console.log("--------------------------------------------------------------------------------");
    console.log(`  • Units with Hostel Preferences : ${satisfaction.withHostelPrefs}`);
    console.log(`      - 1st Choice Hostel         : ${satisfaction.rank1?.count} (${satisfaction.rank1?.percent}%)`);
    console.log(`      - 2nd Choice Hostel         : ${satisfaction.rank2?.count} (${satisfaction.rank2?.percent}%)`);
    console.log(`      - 3rd Choice Hostel         : ${satisfaction.rank3?.count} (${satisfaction.rank3?.percent}%)`);
    console.log(`      - Other (Fallback Round 4)  : ${satisfaction.other?.count} (${satisfaction.other?.percent}%)`);
    console.log(`  • Specific AC Requested         : ${satisfaction.acRequested} units`);
    console.log(`      - AC Choice Matched         : ${satisfaction.acSatisfied?.count} (${satisfaction.acSatisfied?.percent}%)`);
    console.log(`  • Specific Floor Requested      : ${satisfaction.floorRequested} units`);
    console.log(`      - Floor Band Matched        : ${satisfaction.floorSatisfied?.count} (${satisfaction.floorSatisfied?.percent}%)`);

    console.log("\n📌 3. SCIENTIFIC COMPARISON: RANDOM BASELINE vs. HOSTELMATCH");
    console.log("--------------------------------------------------------------------------------");
    console.log("  Metric                        | Random (20 Trials) | HostelMatch | Benefit / Lift");
    console.log("  ------------------------------+--------------------+-------------+---------------");
    console.log(
      `  Average Pair Score            | ${(baseline.avg?.avgPairScore + "%").padEnd(18)} | ${(metrics.avgPairScore + "%").padEnd(11)} | +${improvement.avgPairScoreDiff}% pts`
    );
    console.log(
      `  Good or Above Pairs (>=70%)   | ${(baseline.avg?.goodOrAbovePercent + "%").padEnd(18)} | ${(metrics.goodOrAbovePercent + "%").padEnd(11)} | +${improvement.goodOrAbovePercentDiff}% pts`
    );
    console.log(
      `  Deal-Breaker Conflicts        | ${String(baseline.avg?.pairsExcluded).padEnd(18)} | ${String(metrics.pairsExcluded).padEnd(11)} | -${improvement.pairsExcludedDiff} conflicts`
    );
    console.log(
      `  Rooms with a Conflict         | ${String(baseline.avg?.roomsWithConflict).padEnd(18)} | ${String(metrics.roomsWithConflict).padEnd(11)} | -${improvement.roomsWithConflictDiff} rooms`
    );
    console.log("  ------------------------------------------------------------------------------");
    console.log("  (Note: Same students and same rooms; only algorithmic roommate pairing differs)");

    console.log("\n📌 4. HOSTEL INVENTORY UTILIZATION");
    console.log("--------------------------------------------------------------------------------");
    console.log("  Hostel Code | Rooms Used / Total | Beds Filled / Total | Utilization %");
    console.log("  ------------+--------------------+---------------------+--------------");
    for (const h of hostelUsage.slice(0, 10)) {
      const util = h.totalBeds > 0 ? Math.round((h.bedsFilled / h.totalBeds) * 100) : 0;
      const roomsStr = `${h.roomsUsed} / ${h.totalRooms}`.padEnd(18);
      const bedsStr = `${h.bedsFilled} / ${h.totalBeds}`.padEnd(19);
      console.log(`  ${h.code.padEnd(11)} | ${roomsStr} | ${bedsStr} | ${util}%`);
    }
    if (hostelUsage.length > 10) {
      console.log(`  ... and ${hostelUsage.length - 10} more hostels`);
    }

    console.log("\n================================================================================");
    console.log(`✨ DETERMINISM NOTE: Seed [${result.options.seed}] will always reproduce this exact result.`);
    if (shouldSave) {
      console.log(`💾 Persisted as Draft Run ID: ${result.runId}`);
    } else {
      console.log("🧪 Pure dry-run complete. Run with '--save' to persist as an admin draft.");
    }
    console.log("================================================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("\n❌ Allocation Demo Failed:", err);
    process.exit(1);
  }
}

runDemo();
