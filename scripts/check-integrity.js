#!/usr/bin/env node
/**
 * scripts/check-integrity.js
 * 
 * Command-line runner for the allocation integrity verification & repair suite.
 * Run:
 *   npm run integrity:check
 *   npm run integrity:check -- --fix
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local if running standalone
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

async function main() {
  const shouldFix = process.argv.includes("--fix");

  console.log("==================================================================");
  console.log("  HOSTELMATCH ALLOCATION INTEGRITY DIAGNOSTIC TOOL");
  console.log("==================================================================");
  if (shouldFix) {
    console.log("Mode: DIAGNOSTIC & AUTOMATIC REPAIR (--fix enabled)");
  } else {
    console.log("Mode: DIAGNOSTIC READ-ONLY (Use '--fix' to repair mismatches)");
  }
  console.log("");

  const { checkIntegrity, fixOccupancy } = await import("../src/services/integrityService.js");

  const initialCheck = await checkIntegrity();

  console.log("--- Diagnostic Scope ---");
  console.log(`• Physical Rooms Checked:       ${initialCheck.stats.roomsChecked}`);
  console.log(`• Active Allocations Checked:   ${initialCheck.stats.allocationsChecked}`);
  console.log(`• Locked Roommate Groups:       ${initialCheck.stats.groupsChecked}`);
  console.log(`• Published Allocation Runs:    ${initialCheck.stats.publishedRunsChecked}`);
  console.log("");

  if (initialCheck.isClean) {
    console.log("✅ INTEGRITY REPORT: ALL INVARIANTS SOUND. ZERO PROBLEMS DETECTED.");
    console.log("==================================================================");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`⚠️  INTEGRITY ISSUES DETECTED: Found ${initialCheck.problems.length} problem(s):`);
  initialCheck.problems.forEach((p, idx) => {
    const icon = p.severity === "critical" ? "❌" : "⚠️";
    console.log(`  ${idx + 1}. [${icon} ${p.code}] ${p.message}`);
  });
  console.log("");

  // Check if we should attempt repair
  const occupancyMismatches = initialCheck.problems.filter(
    (p) => p.code === "room_occupancy_mismatch"
  );

  if (shouldFix && occupancyMismatches.length > 0) {
    console.log(`--> Attempting auto-repair on ${occupancyMismatches.length} room occupancy mismatch(es)...`);
    const fixResult = await fixOccupancy();
    console.log(`--> Fixed ${fixResult.fixedRoomsCount} room(s).`);

    console.log("");
    console.log("--> Re-running integrity diagnostics after repair...");
    const postFixCheck = await checkIntegrity();

    if (postFixCheck.isClean) {
      console.log("✅ POST-REPAIR REPORT: All invariants healthy after repair!");
      console.log("==================================================================");
      await mongoose.disconnect();
      process.exit(0);
    } else {
      console.log(`❌ Remaining issues after fix (${postFixCheck.problems.length}):`);
      postFixCheck.problems.forEach((p, idx) => {
        console.log(`  ${idx + 1}. [${p.code}] ${p.message}`);
      });
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  console.log("==================================================================");
  console.log("Integrity check failed. Review errors above or pass '--fix' to repair occupancy.");
  await mongoose.disconnect();
  process.exit(1);
}

main().catch(async (err) => {
  console.error("FATAL: Integrity tool failed with exception:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
