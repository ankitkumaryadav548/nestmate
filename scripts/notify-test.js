#!/usr/bin/env node
/**
 * scripts/notify-test.js
 * 
 * Generates sample notifications for a DEMO student for rapid UI verification.
 * Refuses execution for any non-demo user to protect production data.
 * 
 * Usage:
 *   npm run notify:test -- --reg=DEMO-0001
 *   npm run notify:test -- --reg=DEMO-0001 --clear
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

async function run() {
  const args = process.argv.slice(2);
  let regNumber = "DEMO-0001";
  let isClear = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--reg=")) {
      regNumber = arg.split("=")[1].trim();
    } else if (arg === "--reg" && args[i + 1]) {
      regNumber = args[i + 1].trim();
      i++;
    } else if (arg === "--clear") {
      isClear = true;
    }
  }

  const connectDB = (await import("../src/lib/db.js")).default;
  const User = (await import("../src/models/User.js")).default;
  const Notification = (await import("../src/models/Notification.js")).default;
  const { notify } = await import("../src/services/notificationService.js");
  const { ACTIVE_NOTIFICATION_TYPES } = await import("../src/config/notifications.js");

  console.log("==================================================================");
  console.log(`  HOSTELMATCH NOTIFICATION TEST SCRIPT (${regNumber})`);
  console.log("==================================================================");

  await connectDB();

  // 1. Look up student
  const student = await User.findOne({
    registrationNumber: { $regex: new RegExp(`^${regNumber}$`, "i") },
  });

  if (!student) {
    console.error(`[Error] Student with registration number "${regNumber}" not found.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 2. Strict Safety Guarantee: Refuse for any non-demo user
  if (!student.isDemo) {
    console.error(`[Security Guard] Refusing operation: Student "${student.name}" (${student.registrationNumber}) is NOT a demo account.`);
    console.error("This script is restricted to demo accounts (isDemo: true) only.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Target demo student: "${student.name}" (ID: ${student._id}, Reg: ${student.registrationNumber})`);

  // 3. Handle --clear flag
  if (isClear) {
    console.log(`Clearing all notifications for ${student.name}...`);
    const result = await Notification.deleteMany({ user: student._id });
    console.log(`[Success] Cleared ${result.deletedCount} notifications.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // 4. Sample notification payload data for each active type
  const sampleParams = {
    invitation_received: { leaderName: "Alex Rivera", size: 3 },
    invitation_accepted: { name: "Jordan Lee" },
    invitation_declined: { name: "Morgan Chen" },
    invitation_cancelled: {},
    group_member_joined: { name: "Taylor Swift" },
    group_member_left: { name: "Sam Wilson", backToForming: false },
    group_member_removed: {},
    group_complete: {},
    group_disbanded: {},
    group_leader_changed: { newLeaderName: "Alex Rivera" },
    group_preferences_review: {},
    allocation_published: { hostelName: "Cauvery Block", roomNumber: "B-204" },
    allocation_waitlisted: { reason: "High demand cohort placed on official waitlist" },
    allocation_unallocated: { reason: "No matching rooms available", nextStep: "Contact hostel office for Round 2" },
    allocation_rolled_back: {},
    announcement: {
      title: "Campus Facility Maintenance",
      message: "Scheduled water supply maintenance in North Campus hostels tomorrow from 9:00 AM to 11:30 AM.",
      link: "/dashboard/hostels",
    },
  };

  const seedBatchId = Date.now().toString(36);
  let createdCount = 0;

  console.log(`\nGenerating sample notifications (Batch: ${seedBatchId})...\n`);

  for (const type of ACTIVE_NOTIFICATION_TYPES) {
    const params = sampleParams[type] || {};
    const notif = await notify(student._id, type, params, {
      dedupeParts: [seedBatchId, type],
    });

    if (notif) {
      createdCount++;
      console.log(`  [+] [${type.padEnd(26)}] "${notif.title}" -> ${notif.link || "(no link)"}`);
    } else {
      console.log(`  [-] [${type.padEnd(26)}] Skipped or deduplicated`);
    }
  }

  console.log(`\n==================================================================`);
  console.log(`[Success] Created ${createdCount} sample notifications for ${student.name}.`);
  console.log(`You can now log in as ${student.registrationNumber} and verify:`);
  console.log(`  1. The Bell icon in the navbar shows the unread badge.`);
  console.log(`  2. Opening the Bell dropdown shows the preview items.`);
  console.log(`  3. Navigating to /dashboard/notifications shows full tabs and filter.`);
  console.log(`==================================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("[Fatal Error]", err);
  mongoose.disconnect().finally(() => process.exit(1));
});
