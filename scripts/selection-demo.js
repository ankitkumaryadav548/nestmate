/**
 * Room Selection Window Console Demo Script
 * 
 * Usage:
 *   node scripts/selection-demo.js [--open] [--close] [--status] [--minutes=60]
 *   npm run selection:demo -- --open
 *   npm run selection:demo -- --status
 *   npm run selection:demo -- --close
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

const args = process.argv.slice(2);
const hasOpen = args.includes("--open");
const hasClose = args.includes("--close");
const hasStatus = args.includes("--status");
let minutes = 60;

for (const arg of args) {
  if (arg.startsWith("--minutes=")) {
    minutes = parseInt(arg.split("=")[1], 10) || 60;
  }
}

async function run() {
  const { default: connectDB } = await import("../src/lib/db.js");
  const { default: User } = await import("../src/models/User.js");
  const {
    openNow,
    closeNow,
    getCurrentWindow,
  } = await import("../src/services/selectionWindowService.js");
  const { getSelectionOverview } = await import("../src/services/selectionStatsService.js");

  await connectDB();

  console.log("\n================================================================================");
  console.log("       🔑 HOSTELMATCH ROOM SELECTION (FCFS) DEMO CONTROLLER ⏱️       ");
  console.log("================================================================================");

  // Find an admin user to act as actor
  const admin = await User.findOne({ role: "admin" }).lean();
  const adminId = admin ? admin._id.toString() : "system_admin";

  if (hasOpen) {
    console.log(`\n🚀 Opening selection window immediately for ${minutes} minutes...`);
    const win = await openNow(adminId, minutes);
    console.log(`✅ Window Opened successfully!`);
    console.log(`   ID       : ${win._id}`);
    console.log(`   Name     : ${win.name}`);
    console.log(`   Starts At: ${new Date(win.startsAt).toLocaleString()}`);
    console.log(`   Ends At  : ${new Date(win.endsAt).toLocaleString()}`);
  } else if (hasClose) {
    console.log("\n🛑 Closing selection window immediately...");
    const win = await closeNow(adminId);
    console.log(`✅ Window Closed successfully!`);
    console.log(`   ID       : ${win._id}`);
    console.log(`   Closed At: ${new Date(win.closedAt).toLocaleString()}`);
  }

  // Display status and overview
  console.log("\n📊 CURRENT SELECTION STATUS & OVERVIEW");
  console.log("--------------------------------------------------------------------------------");
  const currentWindow = await getCurrentWindow();
  console.log(`Window Status : ${currentWindow ? currentWindow.status.toUpperCase() : "NONE"}`);
  if (currentWindow) {
    console.log(`Window Name   : ${currentWindow.name}`);
    console.log(`Starts At     : ${new Date(currentWindow.startsAt).toLocaleString()}`);
    console.log(`Ends At       : ${new Date(currentWindow.endsAt).toLocaleString()}`);
    if (currentWindow.countdown) {
      console.log(`Countdown     : ${currentWindow.countdown.minutes}m ${currentWindow.countdown.seconds}s remaining`);
    }
  }

  const overview = await getSelectionOverview();
  console.log("\nRoom Statistics:");
  console.log(`  • Total Rooms     : ${overview.roomCounts.total}`);
  console.log(`  • Available Rooms : ${overview.roomCounts.available}`);
  console.log(`  • Claimed Rooms   : ${overview.roomCounts.claimed}`);
  console.log(`  • Full Rooms      : ${overview.roomCounts.full}`);
  console.log(`  • Maintenance     : ${overview.roomCounts.maintenance}`);

  console.log("\nBed Statistics:");
  console.log(`  • Total Beds      : ${overview.bedCounts.total}`);
  console.log(`  • Reserved Beds   : ${overview.bedCounts.reserved}`);
  console.log(`  • Occupied Beds   : ${overview.bedCounts.occupied}`);
  console.log(`  • Available Beds  : ${overview.bedCounts.available}`);

  console.log("\nUnit & Candidate Statistics:");
  console.log(`  • Groups with Room: ${overview.unitCounts.groupsWithRoom}`);
  console.log(`  • Groups w/o Room : ${overview.unitCounts.groupsWithoutRoom}`);
  console.log(`  • Open Seats      : ${overview.unitCounts.openSeatsInClaimedRooms}`);
  console.log(`  • Ungrouped Pool  : ${overview.candidatePool.totalEligible}`);

  if (overview.claimedRooms.length > 0) {
    console.log(`\nSample Claimed Rooms (${Math.min(5, overview.claimedRooms.length)} of ${overview.claimedRooms.length}):`);
    overview.claimedRooms.slice(0, 5).forEach((cr) => {
      console.log(`  • Room #${cr.roomNumber} (${cr.hostelName}) - ${cr.roomType}, ${cr.capacity} beds (${cr.openSeats} open seats)`);
    });
  }

  console.log("\n================================================================================");
  process.exit(0);
}

run().catch((err) => {
  console.error("\n❌ Selection Demo Script Error:", err);
  process.exit(1);
});

