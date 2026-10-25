/**
 * Room Preferences Service (Phase 4 Part 2)
 * 
 * Handles business rules for group and auto-assign room preferences:
 * - Eligible hostel options with single-query room capacity & AC availability counts
 * - Soft preference retrieval with warnings & suggested default AC type
 * - Secure leader-only and auto-student preference saving with deal-breaker validation
 * - Dynamic group revalidation when members change (join, leave, remove)
 * - Administrative supply-vs-demand metrics aggregator
 */

import mongoose from "mongoose";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Preference from "@/models/Preference";
import Hostel from "@/models/Hostel";
import Room from "@/models/Room";
import RoommateGroup from "@/models/RoommateGroup";
import AllocationIntent from "@/models/AllocationIntent";
import {
  isHostelEligibleForGroup,
  resolveAcConflict,
  suggestDefaultAcType,
  normalizePreferences,
} from "./roomPreferences/preferenceLogic";

/**
 * Retrieves eligible hostels for a student's group or auto-assign intent,
 * along with live room availability counts for their target bed size.
 * 
 * Privacy Guaranteed: Returns only room and bed availability counts.
 * Never leaks student names, occupants, or private details.
 * 
 * @param {string} userId - Authenticated user ID from session
 * @returns {Promise<Array<object>>}
 */
export async function getRoomOptions(userId) {
  await connectDB();

  // 1. Determine student context (active group member vs auto-intent)
  const activeGroup = await RoommateGroup.findOne({
    "members.user": userId,
    status: { $in: ["forming", "complete", "locked"] },
  }).lean();

  let targetSize = 2;
  let memberUsers = [];

  if (activeGroup) {
    targetSize = activeGroup.targetSize;
    const memberIds = activeGroup.members.map((m) => m.user);
    memberUsers = await User.find({ _id: { $in: memberIds } }).select("gender year").lean();
  } else {
    const [user, intent] = await Promise.all([
      User.findById(userId).select("gender year").lean(),
      AllocationIntent.findOne({ user: userId }).lean(),
    ]);

    if (!user) throw new Error("Student account not found");
    targetSize = intent?.preferredRoomSize || 2;
    memberUsers = [user];
  }

  // 2. Fetch all active campus hostels
  const allHostels = await Hostel.find({ isActive: true })
    .select("name code gender location totalFloors facilities allowedYears")
    .sort({ name: 1 })
    .lean();

  // 3. Filter hostels by group eligibility (gender and allowed academic years)
  const eligibleHostels = allHostels.filter((hostel) => {
    const { eligible } = isHostelEligibleForGroup(hostel, memberUsers);
    return eligible;
  });

  const eligibleHostelIds = eligibleHostels.map((h) => h._id);

  // 4. Single aggregation query to fetch room availability for the target size
  // Excludes rooms in maintenance and full rooms
  const availabilityAgg = await Room.aggregate([
    {
      $match: {
        hostel: { $in: eligibleHostelIds },
        capacity: targetSize,
        status: { $ne: "maintenance" },
        $expr: { $lt: ["$currentOccupancy", "$capacity"] },
      },
    },
    {
      $group: {
        _id: {
          hostel: "$hostel",
          roomType: "$roomType", // "AC" or "Non-AC"
        },
        availableRooms: { $sum: 1 },
        availableBeds: { $sum: { $subtract: ["$capacity", "$currentOccupancy"] } },
      },
    },
  ]);

  // Map availability by hostel ID
  const availMap = new Map();
  availabilityAgg.forEach((item) => {
    const hostelId = item._id.hostel.toString();
    const typeKey = (item._id.roomType || "").toLowerCase().includes("non") ? "nonAc" : "ac";

    if (!availMap.has(hostelId)) {
      availMap.set(hostelId, {
        ac: { rooms: 0, beds: 0 },
        nonAc: { rooms: 0, beds: 0 },
      });
    }

    const current = availMap.get(hostelId);
    current[typeKey].rooms += item.availableRooms || 0;
    current[typeKey].beds += item.availableBeds || 0;
  });

  // 5. Build clean, safe response payload
  return eligibleHostels.map((hostel) => {
    const avail = availMap.get(hostel._id.toString()) || {
      ac: { rooms: 0, beds: 0 },
      nonAc: { rooms: 0, beds: 0 },
    };

    return {
      id: hostel._id.toString(),
      name: hostel.name,
      code: hostel.code,
      gender: hostel.gender,
      location: hostel.location || "",
      totalFloors: hostel.totalFloors,
      facilities: hostel.facilities || [],
      allowedYears: hostel.allowedYears || [],
      availability: {
        ac: avail.ac,
        nonAc: avail.nonAc,
        totalAvailableRooms: avail.ac.rooms + avail.nonAc.rooms,
        totalAvailableBeds: avail.ac.beds + avail.nonAc.beds,
        targetSize,
      },
    };
  });
}

/**
 * Retrieves saved room preferences for a student's group or auto-assign intent,
 * along with suggested default AC type and dynamic soft warning diagnostics.
 * 
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<object>}
 */
export async function getMyRoomPreferences(userId) {
  await connectDB();

  // Check active group
  const group = await RoommateGroup.findOne({
    "members.user": userId,
    status: { $in: ["forming", "complete", "locked"] },
  })
    .populate("roomPreferences.preferredHostels", "name code gender totalFloors facilities allowedYears isActive")
    .lean();

  let context = "none";
  let targetSize = 2;
  let isLeader = false;
  let preferences = {
    preferredHostels: [],
    acType: "no-preference",
    floorPreference: "any",
    updatedAt: null,
  };
  let preferencesNeedReview = false;
  let memberDetails = [];

  if (group) {
    context = "group";
    targetSize = group.targetSize;
    isLeader = group.leader.toString() === userId.toString();
    preferencesNeedReview = Boolean(group.preferencesNeedReview);

    if (group.roomPreferences) {
      preferences = {
        preferredHostels: (group.roomPreferences.preferredHostels || []).map((h) => ({
          id: h._id ? h._id.toString() : h.toString(),
          name: h.name || "Hostel",
          code: h.code || "",
          gender: h.gender || "",
          totalFloors: h.totalFloors || 1,
        })),
        acType: group.roomPreferences.acType || "no-preference",
        floorPreference: group.roomPreferences.floorPreference || "any",
        updatedAt: group.roomPreferences.updatedAt || null,
      };
    }

    const memberIds = group.members.map((m) => m.user);
    const [users, prefs] = await Promise.all([
      User.find({ _id: { $in: memberIds } }).select("gender year name").lean(),
      Preference.find({ student: { $in: memberIds } }).select("student acPreference dealBreakers").lean(),
    ]);

    const pMap = new Map();
    prefs.forEach((p) => pMap.set(p.student.toString(), p));

    memberDetails = users.map((u) => ({
      ...u,
      preferences: pMap.get(u._id.toString()) || {},
    }));
  } else {
    // Check auto-allocation intent
    const intent = await AllocationIntent.findOne({ user: userId })
      .populate("roomPreferences.preferredHostels", "name code gender totalFloors facilities allowedYears isActive")
      .lean();

    if (intent && intent.mode === "auto") {
      context = "auto";
      targetSize = intent.preferredRoomSize || 2;
      isLeader = true; // Auto student manages their own preferences

      if (intent.roomPreferences) {
        preferences = {
          preferredHostels: (intent.roomPreferences.preferredHostels || []).map((h) => ({
            id: h._id ? h._id.toString() : h.toString(),
            name: h.name || "Hostel",
            code: h.code || "",
            gender: h.gender || "",
            totalFloors: h.totalFloors || 1,
          })),
          acType: intent.roomPreferences.acType || "no-preference",
          floorPreference: intent.roomPreferences.floorPreference || "any",
          updatedAt: intent.roomPreferences.updatedAt || null,
        };
      }

      const [user, pref] = await Promise.all([
        User.findById(userId).select("gender year name").lean(),
        Preference.findOne({ student: userId }).select("student acPreference dealBreakers").lean(),
      ]);

      if (user) {
        memberDetails = [{ ...user, preferences: pref || {} }];
      }
    }
  }

  // Calculate suggested default AC type
  const suggestedAcType = suggestDefaultAcType(memberDetails);

  // Evaluate dynamic soft warnings
  const warnings = [];

  // 1. AC deal-breaker conflict check
  const acConflict = resolveAcConflict(preferences.acType, memberDetails);
  if (acConflict.conflict) {
    warnings.push("Your chosen AC setting conflicts with one of your members' strict deal-breaker preferences.");
  }

  // 2. Hostel year/active validity check
  if (preferences.preferredHostels.length > 0 && group?.roomPreferences?.preferredHostels) {
    const populated = group.roomPreferences.preferredHostels;
    for (const h of populated) {
      if (h && typeof h === "object") {
        const { eligible, reason } = isHostelEligibleForGroup(h, memberDetails);
        if (!eligible) {
          if (reason === "year") {
            warnings.push(`Hostel "${h.name}" no longer allows the academic year of one of your group members.`);
          } else if (reason === "inactive") {
            warnings.push(`Hostel "${h.name}" is currently marked inactive for residential allocation.`);
          }
        }
      }
    }
  }

  return {
    context,
    targetSize,
    isLeader,
    preferences,
    suggestedAcType,
    preferencesNeedReview,
    warnings,
  };
}

/**
 * Saves or updates room preferences for a group or auto-assign student.
 * 
 * Rules:
 * - Groups: Only the designated group leader can save.
 * - Group must be forming or complete (not locked or disbanded).
 * - Auto-assign students can save their own preferences.
 * - Server strictly validates hostel existence, active status, and eligibility against ALL members.
 * - Rejects any choice conflicting with a member's "acType" deal-breaker.
 * 
 * @param {string} userId - Authenticated user ID
 * @param {object} rawData - { preferredHostels, acType, floorPreference }
 * @returns {Promise<object>}
 */
export async function saveRoomPreferences(userId, rawData) {
  await connectDB();

  const normalized = normalizePreferences(rawData);

  // 1. Check if user is in an active group
  const group = await RoommateGroup.findOne({
    "members.user": userId,
    status: { $in: ["forming", "complete", "locked", "disbanded"] },
  });

  if (group) {
    if (group.status === "locked") {
      throw new Error("Room preferences cannot be modified once room allocation is locked");
    }
    if (group.status === "disbanded") {
      throw new Error("Cannot save room preferences for a disbanded group");
    }
    if (group.leader.toString() !== userId.toString()) {
      const err = new Error("Only the group leader has permission to save room preferences");
      err.statusCode = 403;
      throw err;
    }

    // Load full member profiles & preferences for validation
    const memberIds = group.members.map((m) => m.user);
    const [users, prefs] = await Promise.all([
      User.find({ _id: { $in: memberIds } }).select("gender year name").lean(),
      Preference.find({ student: { $in: memberIds } }).select("student acPreference dealBreakers").lean(),
    ]);

    const pMap = new Map();
    prefs.forEach((p) => pMap.set(p.student.toString(), p));

    const membersWithPrefs = users.map((u) => ({
      ...u,
      preferences: pMap.get(u._id.toString()) || {},
    }));

    // Verify AC deal-breaker conflict
    const acCheck = resolveAcConflict(normalized.acType, membersWithPrefs);
    if (acCheck.conflict) {
      const err = new Error("One of your members requires a different AC setting due to a strict deal-breaker preference");
      err.statusCode = 400;
      throw err;
    }

    // Verify eligibility of each preferred hostel
    if (normalized.preferredHostels.length > 0) {
      const hostels = await Hostel.find({ _id: { $in: normalized.preferredHostels } }).lean();
      const hostelMap = new Map();
      hostels.forEach((h) => hostelMap.set(h._id.toString(), h));

      for (const hId of normalized.preferredHostels) {
        const h = hostelMap.get(hId);
        if (!h) {
          throw new Error("One of the selected hostels could not be found");
        }
        const { eligible, reason } = isHostelEligibleForGroup(h, membersWithPrefs);
        if (!eligible) {
          const reasonMsg =
            reason === "year"
              ? "one of your members' academic year is not eligible"
              : reason === "gender"
              ? "gender designation mismatch"
              : "hostel is not active";
          throw new Error(`Hostel "${h.name}" cannot be selected: ${reasonMsg}`);
        }
      }
    }

    // Save preferences and clear review flag
    group.roomPreferences = {
      preferredHostels: normalized.preferredHostels,
      acType: normalized.acType,
      floorPreference: normalized.floorPreference,
      updatedAt: new Date(),
      updatedBy: userId,
    };
    group.preferencesNeedReview = false;

    await group.save();
    return group.roomPreferences;
  }

  // 2. Check auto-assign student intent
  const intent = await AllocationIntent.findOne({ user: userId });
  if (intent && intent.mode === "auto") {
    const [user, pref] = await Promise.all([
      User.findById(userId).select("gender year").lean(),
      Preference.findOne({ student: userId }).select("acPreference dealBreakers").lean(),
    ]);

    if (!user) throw new Error("Student account not found");
    const memberObj = { ...user, preferences: pref || {} };

    // AC conflict check
    const acCheck = resolveAcConflict(normalized.acType, [memberObj]);
    if (acCheck.conflict) {
      throw new Error("Selected AC setting conflicts with your personal deal-breaker preference");
    }

    // Hostel eligibility check
    if (normalized.preferredHostels.length > 0) {
      const hostels = await Hostel.find({ _id: { $in: normalized.preferredHostels } }).lean();
      for (const hId of normalized.preferredHostels) {
        const h = hostels.find((item) => item._id.toString() === hId);
        if (!h) throw new Error("Selected hostel not found");
        const { eligible } = isHostelEligibleForGroup(h, [memberObj]);
        if (!eligible) {
          throw new Error(`You are not eligible for hostel "${h.name}"`);
        }
      }
    }

    intent.roomPreferences = {
      preferredHostels: normalized.preferredHostels,
      acType: normalized.acType,
      floorPreference: normalized.floorPreference,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    await intent.save();
    return intent.roomPreferences;
  }

  throw new Error("You must be either in a roommate group or have chosen auto-assign to configure room preferences");
}

/**
 * Re-validates room preferences whenever a group's roster changes (join, leave, remove).
 * 
 * - Purges preferred hostels that no longer permit the new member cohort.
 * - Resets AC choice to the recommended default if an AC deal-breaker conflict arises.
 * - Flags `preferencesNeedReview = true` so students are notified on their dashboard.
 * 
 * @param {string|mongoose.Types.ObjectId} groupId 
 * @returns {Promise<void>}
 */
export async function revalidatePreferencesForGroup(groupId) {
  await connectDB();

  const group = await RoommateGroup.findById(groupId);
  if (!group || !group.roomPreferences) return;

  const memberIds = group.members.map((m) => m.user);
  if (memberIds.length === 0) return;

  const [users, prefs] = await Promise.all([
    User.find({ _id: { $in: memberIds } }).select("gender year name").lean(),
    Preference.find({ student: { $in: memberIds } }).select("student acPreference dealBreakers").lean(),
  ]);

  const pMap = new Map();
  prefs.forEach((p) => pMap.set(p.student.toString(), p));

  const membersWithPrefs = users.map((u) => ({
    ...u,
    preferences: pMap.get(u._id.toString()) || {},
  }));

  let changed = false;

  // 1. Revalidate preferred hostels
  const currentHostelIds = group.roomPreferences.preferredHostels || [];
  if (currentHostelIds.length > 0) {
    const hostels = await Hostel.find({ _id: { $in: currentHostelIds } }).lean();
    const hostelMap = new Map();
    hostels.forEach((h) => hostelMap.set(h._id.toString(), h));

    const remainingEligibleHostelIds = [];
    for (const hId of currentHostelIds) {
      const h = hostelMap.get(hId.toString());
      if (h && isHostelEligibleForGroup(h, membersWithPrefs).eligible) {
        remainingEligibleHostelIds.push(h._id);
      } else {
        changed = true; // Ineligible hostel removed
      }
    }
    group.roomPreferences.preferredHostels = remainingEligibleHostelIds;
  }

  // 2. Revalidate AC choice
  const currentAc = group.roomPreferences.acType || "no-preference";
  const acConflict = resolveAcConflict(currentAc, membersWithPrefs);
  if (acConflict.conflict) {
    group.roomPreferences.acType = suggestDefaultAcType(membersWithPrefs);
    changed = true;
  }

  const wasNeedReview = !!group.preferencesNeedReview;

  // Whenever members change while preferences were configured, signal review
  if (
    changed ||
    (group.roomPreferences.preferredHostels && group.roomPreferences.preferredHostels.length > 0) ||
    group.roomPreferences.acType !== "no-preference"
  ) {
    group.preferencesNeedReview = true;
  }

  await group.save();

  // Post-commit notification: group_preferences_review to LEADER only (best-effort)
  if (!wasNeedReview && group.preferencesNeedReview && group.leader) {
    try {
      const { notify } = await import("./notificationService.js");
      await notify(
        group.leader,
        "group_preferences_review",
        {},
        {
          dedupeParts: [group._id.toString(), "pref_review"],
          data: { groupId: group._id.toString() },
        }
      );
    } catch (notifErr) {
      console.error("[Notification Error]:", notifErr.message);
    }
  }
}

/**
 * Clears the `preferencesNeedReview` notice flag when leader acknowledges the changes.
 * 
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
export async function acknowledgePreferencesReview(userId) {
  await connectDB();

  const group = await RoommateGroup.findOne({
    leader: userId,
    status: { $in: ["forming", "complete"] },
  });

  if (!group) throw new Error("Leader of an active group required");
  group.preferencesNeedReview = false;
  await group.save();
  return true;
}

/**
 * Administrative: Aggregates student room preference demand vs. live campus inventory.
 * Gives the residential warden a clear pre-allocation balance sheet.
 * 
 * @returns {Promise<object>}
 */
export async function getPreferencesDemandSummary() {
  await connectDB();

  // 1. Fetch active groups & auto-assign intents
  const [activeGroups, autoIntents, allHostels, roomAgg] = await Promise.all([
    RoommateGroup.find({ status: { $in: ["forming", "complete"] } })
      .select("targetSize status roomPreferences members")
      .lean(),
    AllocationIntent.find({ mode: "auto" })
      .select("preferredRoomSize roomPreferences user")
      .lean(),
    Hostel.find({ isActive: true })
      .select("name code gender totalFloors")
      .sort({ name: 1 })
      .lean(),
    Room.aggregate([
      { $match: { status: { $ne: "maintenance" } } },
      {
        $group: {
          _id: {
            hostel: "$hostel",
            capacity: "$capacity",
            roomType: "$roomType",
          },
          totalRooms: { $sum: 1 },
          totalBeds: { $sum: "$capacity" },
          availableRooms: {
            $sum: {
              $cond: [{ $lt: ["$currentOccupancy", "$capacity"] }, 1, 0],
            },
          },
          availableBeds: {
            $sum: { $subtract: ["$capacity", "$currentOccupancy"] },
          },
        },
      },
    ]),
  ]);

  // Map inventory by hostel
  const inventoryByHostel = new Map();
  const campusTotals = {
    totalRooms: 0,
    totalBeds: 0,
    availableRooms: 0,
    availableBeds: 0,
    bySize: {
      2: { rooms: 0, beds: 0, availableRooms: 0, availableBeds: 0 },
      3: { rooms: 0, beds: 0, availableRooms: 0, availableBeds: 0 },
      4: { rooms: 0, beds: 0, availableRooms: 0, availableBeds: 0 },
    },
    ac: { availableRooms: 0, availableBeds: 0 },
    nonAc: { availableRooms: 0, availableBeds: 0 },
  };

  roomAgg.forEach((item) => {
    const hId = item._id.hostel.toString();
    const cap = item._id.capacity;
    const isAc = (item._id.roomType || "").toLowerCase() === "ac";

    if (!inventoryByHostel.has(hId)) {
      inventoryByHostel.set(hId, {
        totalRooms: 0,
        totalBeds: 0,
        availableRooms: 0,
        availableBeds: 0,
        bySize: { 2: 0, 3: 0, 4: 0 },
        bySizeAvailable: { 2: 0, 3: 0, 4: 0 },
        acBedsAvailable: 0,
        nonAcBedsAvailable: 0,
      });
    }

    const hInv = inventoryByHostel.get(hId);
    hInv.totalRooms += item.totalRooms;
    hInv.totalBeds += item.totalBeds;
    hInv.availableRooms += item.availableRooms;
    hInv.availableBeds += item.availableBeds;

    if (hInv.bySize[cap] !== undefined) {
      hInv.bySize[cap] += item.totalRooms;
      hInv.bySizeAvailable[cap] += item.availableRooms;
    }

    if (isAc) {
      hInv.acBedsAvailable += item.availableBeds;
      campusTotals.ac.availableBeds += item.availableBeds;
      campusTotals.ac.availableRooms += item.availableRooms;
    } else {
      hInv.nonAcBedsAvailable += item.availableBeds;
      campusTotals.nonAc.availableBeds += item.availableBeds;
      campusTotals.nonAc.availableRooms += item.availableRooms;
    }

    campusTotals.totalRooms += item.totalRooms;
    campusTotals.totalBeds += item.totalBeds;
    campusTotals.availableRooms += item.availableRooms;
    campusTotals.availableBeds += item.availableBeds;

    if (campusTotals.bySize[cap]) {
      campusTotals.bySize[cap].rooms += item.totalRooms;
      campusTotals.bySize[cap].beds += item.totalBeds;
      campusTotals.bySize[cap].availableRooms += item.availableRooms;
      campusTotals.bySize[cap].availableBeds += item.availableBeds;
    }
  });

  // 2. Count Demand
  const firstChoiceHostelCounts = new Map();
  const acDemand = { ac: 0, "non-ac": 0, "no-preference": 0 };
  const floorDemand = { low: 0, mid: 0, high: 0, any: 0 };
  const roomSizeDemand = {
    2: { groups: 0, autoStudents: 0, totalBedsDemanded: 0 },
    3: { groups: 0, autoStudents: 0, totalBedsDemanded: 0 },
    4: { groups: 0, autoStudents: 0, totalBedsDemanded: 0 },
  };

  // Group demand
  activeGroups.forEach((g) => {
    const p = g.roomPreferences || {};
    const firstChoice = p.preferredHostels?.[0]?.toString();
    if (firstChoice) {
      firstChoiceHostelCounts.set(firstChoice, (firstChoiceHostelCounts.get(firstChoice) || 0) + 1);
    }

    const ac = p.acType || "no-preference";
    acDemand[ac] = (acDemand[ac] || 0) + 1;

    const floor = p.floorPreference || "any";
    floorDemand[floor] = (floorDemand[floor] || 0) + 1;

    const size = g.targetSize;
    if (roomSizeDemand[size]) {
      roomSizeDemand[size].groups += 1;
      roomSizeDemand[size].totalBedsDemanded += size;
    }
  });

  // Auto students demand
  autoIntents.forEach((intent) => {
    const p = intent.roomPreferences || {};
    const firstChoice = p.preferredHostels?.[0]?.toString();
    if (firstChoice) {
      firstChoiceHostelCounts.set(firstChoice, (firstChoiceHostelCounts.get(firstChoice) || 0) + 1);
    }

    const ac = p.acType || "no-preference";
    acDemand[ac] = (acDemand[ac] || 0) + 1;

    const floor = p.floorPreference || "any";
    floorDemand[floor] = (floorDemand[floor] || 0) + 1;

    const size = intent.preferredRoomSize || 2;
    if (roomSizeDemand[size]) {
      roomSizeDemand[size].autoStudents += 1;
      roomSizeDemand[size].totalBedsDemanded += 1; // 1 bed per auto student
    }
  });

  // 3. Build per-hostel summary table
  const hostelSummaries = allHostels.map((h) => {
    const hId = h._id.toString();
    const inv = inventoryByHostel.get(hId) || {
      totalRooms: 0,
      totalBeds: 0,
      availableRooms: 0,
      availableBeds: 0,
      bySize: { 2: 0, 3: 0, 4: 0 },
      bySizeAvailable: { 2: 0, 3: 0, 4: 0 },
      acBedsAvailable: 0,
      nonAcBedsAvailable: 0,
    };

    const firstChoiceDemands = firstChoiceHostelCounts.get(hId) || 0;

    return {
      id: hId,
      name: h.name,
      code: h.code,
      gender: h.gender,
      firstChoiceDemand: firstChoiceDemands,
      inventory: inv,
    };
  });

  // Sort by first choice demand descending
  hostelSummaries.sort((a, b) => b.firstChoiceDemand - a.firstChoiceDemand);

  return {
    totals: {
      activeGroupsCount: activeGroups.length,
      autoAssignCount: autoIntents.length,
      totalEntitiesRequesting: activeGroups.length + autoIntents.length,
    },
    acDemand,
    floorDemand,
    roomSizeDemand,
    campusTotals,
    hostelSummaries,
  };
}
