const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
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

async function findTestingAccounts() {
  await mongoose.connect(process.env.MONGODB_URI);
  const RoommateGroup = mongoose.models.RoommateGroup || mongoose.model("RoommateGroup", new mongoose.Schema({}, { strict: false }));
  const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({}, { strict: false }));

  // Find a forming or complete group with >= 2 members
  const group = await RoommateGroup.findOne({ isDemo: true, "members.1": { $exists: true } }).lean();
  if (!group) {
    console.log("No demo group found with >= 2 members");
    process.exit(1);
  }

  const leader = await User.findById(group.leader).lean();
  const nonLeaderId = group.members.find(m => m.user.toString() !== group.leader.toString()).user;
  const nonLeader = await User.findById(nonLeaderId).lean();

  console.log("Found group:", group._id.toString());
  console.log("Leader:", leader.email, leader.name);
  console.log("Non-Leader Member:", nonLeader.email, nonLeader.name);

  await mongoose.disconnect();
}

findTestingAccounts().catch(console.error);
