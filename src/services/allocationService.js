/**
 * Hostel Allocation Service (Phase 5 - Simulation & Draft Mode)
 * 
 * Orchestrates data loading, cached compatibility evaluation, pure pipeline execution,
 * invariant verification, metric compilation, and draft persistence.
 * 
 * ZERO LIVE DATA MODIFICATION GUARANTEE:
 * This service never modifies Room, Hostel, RoommateGroup, GroupInvitation,
 * AllocationIntent, User, StudentProfile, or Preference documents.
 */

import { z } from "zod";
import connectDB from "../lib/db.js";
import User from "../models/User.js";
import Preference from "../models/Preference.js";
import Hostel from "../models/Hostel.js";
import Room from "../models/Room.js";
import RoommateGroup from "../models/RoommateGroup.js";
import AllocationIntent from "../models/AllocationIntent.js";
import AllocationRun from "../models/AllocationRun.js";
import AllocationAssignment from "../models/AllocationAssignment.js";
import MatchingSettings from "../models/MatchingSettings.js";
import { DEFAULT_WEIGHTS } from "../config/matching.js";
import { calculateCompatibility } from "./matching/scoreEngine.js";
import {
  DEFAULT_OPTIONS,
  PRIORITY_MODES,
  MAX_DRAFT_RUNS_KEPT,
  ENGINE_VERSION,
} from "../config/allocation.js";
import { GROUP_SIZE_OPTIONS } from "../config/groups.js";
import { createRng } from "./allocation/rng.js";
import {
  roomMeetsHardConstraints,
  mergeRoomPreferences,
  preferenceScore,
  placeUnits,
} from "./allocation/roomPlacement.js";
import {
  fillFormingGroups,
  handleIncompleteGroups,
  clusterPool,
  improveBySwaps,
} from "./allocation/poolClustering.js";
import {
  evaluateRooms,
  buildRandomBaseline,
  summarizePreferenceSatisfaction,
} from "./allocation/metrics.js";
import { validateAssignments } from "./allocation/validateAssignments.js";

/**
 * Zod validation schema for allocation run options.
 */
const runOptionsSchema = z.object({
  seed: z.union([z.number(), z.string()]).nullable().optional(),
  priorityMode: z.enum(PRIORITY_MODES).default("lottery"),
  gender: z.enum(["all", "male", "female", "other"]).default("all"),
  studentScope: z.enum(["all", "demo", "real"]).default("all"),
  includeUngrouped: z.boolean().default(true),
  defaultRoomSize: z.number().refine((val) => GROUP_SIZE_OPTIONS.includes(val), {
    message: "defaultRoomSize must be 2, 3, or 4",
  }).default(2),
  incompleteGroupPolicy: z.enum(["shrink", "waitlist"]).default("shrink"),
  maxSwapPasses: z.number().min(0).max(10).default(3),
  baselineTrials: z.number().min(1).max(50).default(20),
});

/**
 * Placeholder hook for allocated user IDs.
 * In Phase 6 (Publishing & Locking), this will return IDs of students whose
 * allocations have been officially finalized to prevent duplicate placement.
 * 
 * @returns {Promise<string[]>}
 */
export async function getAllocatedUserIds() {
  return [];
}

/**
 * Formats a raw user document and preference document into the standardized student shape.
 * 
 * @param {object} user 
 * @param {object} pref 
 * @param {number} [preferredRoomSize] 
 * @param {object} [roomPreferences]
 * @returns {object}
 */
export function mapToStudentShape(user, pref = {}, preferredRoomSize = null, roomPreferences = null) {
  const p = pref.preferences || pref;
  return {
    id: user._id.toString(),
    _id: user._id,
    name: user.name,
    gender: user.gender,
    year: user.year || 1,
    course: user.course || "",
    department: user.department || "",
    registrationNumber: user.registrationNumber || "",
    isDemo: Boolean(user.isDemo),
    preferredRoomSize: preferredRoomSize || 2,
    roomPreferences: roomPreferences || null,
    preferences: {
      sleepSchedule: p.sleepSchedule || "normal",
      studyTime: p.studyTime || "flexible",
      cleanliness: typeof p.cleanliness === "number" ? p.cleanliness : 3,
      noiseTolerance: typeof p.noiseTolerance === "number" ? p.noiseTolerance : 3,
      socialLevel: typeof p.socialLevel === "number" ? p.socialLevel : 3,
      acPreference: p.acPreference || "no-preference",
      foodType: p.foodType || "veg",
      okWithDifferentFood: p.okWithDifferentFood !== false,
      languages: Array.isArray(p.languages) ? p.languages : ["English"],
      nightCalls: p.nightCalls || "sometimes",
      dealBreakers: Array.isArray(p.dealBreakers) ? p.dealBreakers : [],
      completedAt: p.completedAt || null,
    },
  };
}

/**
 * Executes an allocation simulation run.
 * 
 * @param {string|null} adminId - User ID of the initiating administrator
 * @param {object} rawOptions - User-supplied options
 * @param {object} [execConfig] - { persist: boolean }
 * @returns {Promise<object>} Run summary and results
 */
export async function runAllocation(adminId, rawOptions = {}, { persist = true } = {}) {
  await connectDB();
  const startTime = Date.now();

  // 1. Validate & merge options
  const options = runOptionsSchema.parse({
    ...DEFAULT_OPTIONS,
    ...rawOptions,
  });

  if (options.seed === null || options.seed === undefined) {
    options.seed = Math.floor(Math.random() * 900000) + 100000;
  }

  // 2. Prevent overlapping runs within 5 minutes
  if (persist) {
    const runningCutoff = new Date(Date.now() - 5 * 60 * 1000);
    const existingRunning = await AllocationRun.findOne({
      status: "running",
      startedAt: { $gte: runningCutoff },
    }).lean();

    if (existingRunning) {
      const error = new Error("Another allocation simulation is currently in progress. Please wait for it to finish.");
      error.code = "ALLOCATION_IN_PROGRESS";
      error.status = 409;
      throw error;
    }
  }

  // 3. Load active matching settings
  const settingsDoc = await MatchingSettings.findOne().lean();
  const weights = settingsDoc?.weights ? { ...DEFAULT_WEIGHTS, ...settingsDoc.weights } : { ...DEFAULT_WEIGHTS };

  // 4. Load inventory: active hostels and empty rooms
  const hostelQuery = { isActive: true };
  if (options.gender !== "all") {
    // A gender-specific run only needs hostels that accept this gender
    if (options.gender === "male") hostelQuery.gender = { $in: ["boys", "mixed"] };
    else if (options.gender === "female") hostelQuery.gender = { $in: ["girls", "mixed"] };
    else hostelQuery.gender = "mixed";
  }

  const rawHostels = await Hostel.find(hostelQuery).lean();
  const activeHostelIds = rawHostels.map((h) => h._id);

  const rawRooms = await Room.find({
    hostel: { $in: activeHostelIds },
    currentOccupancy: 0,
    status: { $ne: "maintenance" },
  }).lean();

  const hostels = rawHostels.map((h) => ({
    id: h._id.toString(),
    _id: h._id,
    code: h.code,
    name: h.name,
    gender: h.gender,
    isActive: h.isActive,
    allowedYears: h.allowedYears || [],
    totalFloors: h.totalFloors,
  }));

  const rooms = rawRooms.map((r) => ({
    id: r._id.toString(),
    _id: r._id,
    hostelId: r.hostel.toString(),
    roomNumber: r.roomNumber,
    floor: r.floor,
    capacity: r.capacity,
    roomType: r.roomType,
  }));

  // 5. Query candidate students, groups, intents, and preferences
  const userQuery = { role: "student", isActive: true };
  if (options.gender !== "all") {
    userQuery.gender = options.gender;
  }
  if (options.studentScope === "demo") {
    userQuery.isDemo = true;
  } else if (options.studentScope === "real") {
    userQuery.isDemo = false;
  }

  const allActiveStudents = await User.find(userQuery).lean();
  const studentUserIds = allActiveStudents.map((u) => u._id);
  const studentUserMap = new Map();
  for (const u of allActiveStudents) {
    studentUserMap.set(u._id.toString(), u);
  }

  // Fetch lifestyle preferences
  const allPrefs = await Preference.find({ student: { $in: studentUserIds } }).lean();
  const prefMap = new Map();
  for (const p of allPrefs) {
    prefMap.set(p.student.toString(), p);
  }

  // Fetch allocation intents
  const allIntents = await AllocationIntent.find({ user: { $in: studentUserIds } }).lean();
  const intentMap = new Map();
  for (const it of allIntents) {
    intentMap.set(it.user.toString(), it);
  }

  // Fetch active roommate groups
  const groupQuery = {
    status: { $in: ["complete", "forming", "locked"] },
  };
  if (options.studentScope === "demo") {
    groupQuery.isDemo = true;
  } else if (options.studentScope === "real") {
    groupQuery.isDemo = false;
  }

  const allGroups = await RoommateGroup.find(groupQuery)
    .populate("members.user", "name gender year course department registrationNumber isDemo")
    .lean();

  // Exclude locked group members and previously finalized students
  const allocatedIds = new Set(await getAllocatedUserIds());
  const lockedGroupMemberIds = new Set();
  for (const g of allGroups) {
    if (g.status === "locked") {
      for (const m of g.members || []) {
        if (m.user?._id) lockedGroupMemberIds.add(m.user._id.toString());
      }
    }
  }

  // Identify students in complete or forming groups
  const groupMemberStudentIds = new Set();
  const validCompleteGroups = [];
  const validFormingGroups = [];

  for (const g of allGroups) {
    if (g.status === "locked" || g.status === "disbanded") continue;

    const groupMembers = [];
    let hasExcludedMember = false;

    for (const m of g.members || []) {
      const u = m.user;
      if (!u || !u._id) continue;
      const strId = u._id.toString();

      if (allocatedIds.has(strId) || lockedGroupMemberIds.has(strId)) {
        hasExcludedMember = true;
        break;
      }

      if (options.gender !== "all" && u.gender !== options.gender) {
        hasExcludedMember = true;
        break;
      }

      const pref = prefMap.get(strId);
      // Students with incomplete preferences cannot participate
      if (!pref || !pref.completedAt) {
        hasExcludedMember = true;
        break;
      }

      groupMembers.push(mapToStudentShape(u, pref));
      groupMemberStudentIds.add(strId);
    }

    if (hasExcludedMember || groupMembers.length === 0) {
      continue;
    }

    const groupObj = {
      id: g._id.toString(),
      _id: g._id,
      gender: groupMembers[0].gender,
      targetSize: g.targetSize,
      members: groupMembers,
      roomPreferences: g.roomPreferences || {},
      completedAtMs: g.completedAt ? new Date(g.completedAt).getTime() : null,
      createdAtMs: g.createdAt ? new Date(g.createdAt).getTime() : null,
      averageScore: g.averageScore,
      lowestPairScore: g.lowestPairScore,
    };

    if (g.status === "complete" && groupMembers.length === g.targetSize) {
      validCompleteGroups.push(groupObj);
    } else if (g.status === "forming") {
      validFormingGroups.push(groupObj);
    }
  }

  // 6. Identify Solo Pool Students
  const poolStudents = [];
  const unallocatedList = [];

  for (const user of allActiveStudents) {
    const strId = user._id.toString();
    if (allocatedIds.has(strId) || lockedGroupMemberIds.has(strId) || groupMemberStudentIds.has(strId)) {
      continue;
    }

    const pref = prefMap.get(strId);
    if (!pref || !pref.completedAt) {
      unallocatedList.push({
        user: user._id,
        reason: "preferences_incomplete",
        studentName: user.name,
      });
      continue;
    }

    const intent = intentMap.get(strId);
    const isAutoIntent = intent && intent.mode === "auto";
    const isUngrouped = !intent || intent.mode === "group";

    if (isAutoIntent || (isUngrouped && options.includeUngrouped)) {
      const preferredRoomSize = intent?.preferredRoomSize || options.defaultRoomSize;
      const roomPrefs = intent?.roomPreferences || null;
      poolStudents.push(mapToStudentShape(user, pref, preferredRoomSize, roomPrefs));
    }
  }

  // 7. Cached Scoring Function
  const pairCache = new Map();
  const scoreFn = (a, b) => {
    const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
    if (pairCache.has(key)) return pairCache.get(key);
    const res = calculateCompatibility(a, b, weights);
    pairCache.set(key, res);
    return res;
  };

  // 8. Execute Pure Allocation Pipeline
  // Step A: Fill forming groups with solo pool candidates
  const { filledUnits, partialGroups, usedStudentIds } = fillFormingGroups(
    validFormingGroups,
    poolStudents,
    weights,
    scoreFn,
    options
  );

  // Step B: Handle incomplete groups (shrink or waitlist)
  const { shrunkUnits, dissolvedStudents, waitlistedGroups } = handleIncompleteGroups(
    partialGroups,
    options.incompleteGroupPolicy,
    scoreFn
  );

  // Step C: Cluster remaining solo pool students
  const remainingPool = poolStudents.filter((s) => !usedStudentIds.has(s.id)).concat(dissolvedStudents);

  const { groups: clusterGroups, unallocated: clusterUnallocated } = clusterPool(
    remainingPool,
    weights,
    scoreFn,
    options
  );

  for (const un of clusterUnallocated) {
    unallocatedList.push({
      user: un.student._id,
      reason: un.reason,
      studentName: un.student.name,
    });
  }

  // Step D: Swap improvement pass across newly clustered pool groups
  const improvedPoolGroups = improveBySwaps(clusterGroups, weights, scoreFn, options.maxSwapPasses);

  // Step E: Convert all group formations into placeable units
  const unitsToPlace = [];

  // Complete groups from database
  for (const g of validCompleteGroups) {
    unitsToPlace.push({
      unitId: `complete_${g.id}`,
      kind: "group",
      sourceGroupId: g.id,
      members: g.members,
      size: g.targetSize,
      roomPreferences: g.roomPreferences || {},
      completedAtMs: g.completedAtMs,
      groupAverage: g.averageScore,
      groupLowest: g.lowestPairScore,
    });
  }

  // Filled groups
  for (const u of filledUnits) {
    unitsToPlace.push(u);
  }

  // Shrunk groups
  for (const u of shrunkUnits) {
    unitsToPlace.push(u);
  }

  // Clustered pool groups
  for (let idx = 0; idx < improvedPoolGroups.length; idx++) {
    const g = improvedPoolGroups[idx];
    const mergedPrefs = mergeRoomPreferences(g.members);
    unitsToPlace.push({
      unitId: `pool_${idx + 1}`,
      kind: "pool-group",
      sourceGroupId: null,
      members: g.members,
      size: g.size,
      roomPreferences: mergedPrefs,
      completedAtMs: null,
      groupAverage: g.average,
      groupLowest: g.lowest,
    });
  }

  // Step F: Place units into physical rooms
  const { assignments, waitlist } = placeUnits(unitsToPlace, rooms, hostels, options);

  // Combine algorithmic waitlist with any policy waitlisted groups
  const combinedWaitlist = [...waitlist, ...waitlistedGroups];

  // 9. Invariant Validation
  let validationError = null;
  try {
    validateAssignments(assignments, unitsToPlace, rooms, hostels);
  } catch (err) {
    validationError = err.message;
  }

  // 10. Metrics Compilation
  const roomMembersList = assignments.map((a) => a.unit.members);
  const realMetrics = evaluateRooms(roomMembersList, scoreFn);

  // Monte Carlo Random Baseline
  const assignedByGender = { male: [], female: [], other: [] };
  const roomCapacitiesByGender = { male: [], female: [], other: [] };

  for (const a of assignments) {
    const g = a.unit.members[0]?.gender || "other";
    if (assignedByGender[g]) {
      assignedByGender[g].push(...a.unit.members);
      roomCapacitiesByGender[g].push(a.room.capacity);
    }
  }

  const baseline = buildRandomBaseline(
    assignedByGender,
    roomCapacitiesByGender,
    scoreFn,
    options.seed,
    options.baselineTrials
  );

  // Preference Satisfaction
  const unitsById = new Map();
  for (const u of unitsToPlace) unitsById.set(u.unitId, u);
  const prefSatisfaction = summarizePreferenceSatisfaction(assignments, unitsById);

  // Hostel Usage Breakdown
  const hostelUsageMap = new Map();
  for (const h of hostels) {
    hostelUsageMap.set(h.id, {
      id: h.id,
      code: h.code,
      name: h.name,
      roomsUsed: 0,
      bedsFilled: 0,
      totalRooms: 0,
      totalBeds: 0,
    });
  }

  for (const r of rooms) {
    const usage = hostelUsageMap.get(r.hostelId);
    if (usage) {
      usage.totalRooms++;
      usage.totalBeds += r.capacity;
    }
  }

  for (const a of assignments) {
    const usage = hostelUsageMap.get(a.hostelId);
    if (usage) {
      usage.roomsUsed++;
      usage.bedsFilled += a.room.capacity;
    }
  }

  const hostelUsage = Array.from(hostelUsageMap.values()).filter((h) => h.totalRooms > 0);

  // Waitlist Reason Breakdown
  const waitlistReasonCounts = {};
  for (const w of combinedWaitlist) {
    waitlistReasonCounts[w.reason] = (waitlistReasonCounts[w.reason] || 0) + 1;
  }

  // Comparison metrics: our improvement over random
  const improvement = {
    avgPairScoreDiff: Math.round((realMetrics.avgPairScore - baseline.avg.avgPairScore) * 10) / 10,
    goodOrAbovePercentDiff: realMetrics.goodOrAbovePercent - baseline.avg.goodOrAbovePercent,
    pairsExcludedDiff: baseline.avg.pairsExcluded - realMetrics.pairsExcluded,
    roomsWithConflictDiff: baseline.avg.roomsWithConflict - realMetrics.roomsWithConflict,
  };

  const totalStudentsAllocated = assignments.reduce((acc, a) => acc + a.unit.members.length, 0);
  const totalStudentsWaitlisted = combinedWaitlist.reduce((acc, w) => acc + (w.unit?.members?.length || w.unit?.size || 0), 0);
  const durationMs = Date.now() - startTime;

  const stats = {
    durationMs,
    counts: {
      completeGroupsPlaced: assignments.filter((a) => (a.unit?.kind || a.unitKind) === "group").length,
      formingGroupsFilled: assignments.filter((a) => (a.unit?.kind || a.unitKind) === "filled-group").length,
      shrunkGroupsPlaced: assignments.filter((a) => (a.unit?.kind || a.unitKind) === "shrunk-group").length,
      poolGroupsPlaced: assignments.filter((a) => (a.unit?.kind || a.unitKind) === "pool-group").length,
      unitsPlaced: assignments.length,
      unitsWaitlisted: combinedWaitlist.length,
      studentsAllocated: totalStudentsAllocated,
      studentsWaitlisted: totalStudentsWaitlisted,
      studentsUnallocated: unallocatedList.length,
      roomsUsed: assignments.length,
      bedsFilled: totalStudentsAllocated,
    },
    metrics: realMetrics,
    baseline,
    improvement,
    satisfaction: prefSatisfaction,
    hostelUsage,
    waitlistReasonCounts,
  };

  // 11. Database Persistence
  let createdRun = null;

  if (persist) {
    const runStatus = validationError ? "failed" : "draft";

    createdRun = await AllocationRun.create({
      name: `Run ${new Date().toISOString().replace("T", " ").substring(0, 19)}`,
      status: runStatus,
      options,
      weightsSnapshot: weights,
      engineVersion: ENGINE_VERSION,
      stats,
      unallocated: unallocatedList.map((u) => ({ user: u.user, reason: u.reason })),
      waitlistCount: combinedWaitlist.length,
      createdBy: adminId,
      startedAt: new Date(startTime),
      finishedAt: new Date(),
      errorMessage: validationError,
    });

    // If validation succeeded, store assignments in bulk
    if (!validationError) {
      const assignmentDocs = [];

      // Placed assignments
      for (const a of assignments) {
        assignmentDocs.push({
          run: createdRun._id,
          unitKind: a.unit.kind,
          sourceGroup: a.unit.sourceGroupId || null,
          members: a.unit.members.map((m) => m._id),
          room: a.room._id || a.room.id,
          hostel: a.hostel._id || a.hostel.id,
          status: "assigned",
          waitlistReason: null,
          size: a.unit.size,
          groupAverage: a.unit.groupAverage,
          groupLowest: a.unit.groupLowest,
          hostelRank: a.hostelRank,
          acMatch: a.acMatch,
          floorMatch: a.floorMatch,
          preferenceScore: a.preferenceScore,
          round: a.round,
          order: a.order,
        });
      }

      // Waitlisted assignments
      for (let wIdx = 0; wIdx < combinedWaitlist.length; wIdx++) {
        const w = combinedWaitlist[wIdx];
        assignmentDocs.push({
          run: createdRun._id,
          unitKind: w.unit.kind || "group",
          sourceGroup: w.unit.sourceGroupId || null,
          members: (w.unit.members || []).map((m) => m._id),
          room: null,
          hostel: null,
          status: "waitlisted",
          waitlistReason: w.reason,
          size: w.unit.size || w.unit.members?.length || 2,
          groupAverage: w.unit.groupAverage || null,
          groupLowest: w.unit.groupLowest || null,
          hostelRank: null,
          acMatch: null,
          floorMatch: null,
          preferenceScore: 0,
          round: null,
          order: assignments.length + wIdx + 1,
        });
      }

      if (assignmentDocs.length > 0) {
        await AllocationAssignment.insertMany(assignmentDocs);
      }

      // Prune older drafts beyond MAX_DRAFT_RUNS_KEPT
      const draftRuns = await AllocationRun.find({ status: "draft" })
        .sort({ createdAt: -1 })
        .select("_id")
        .lean();

      if (draftRuns.length > MAX_DRAFT_RUNS_KEPT) {
        const excessIds = draftRuns.slice(MAX_DRAFT_RUNS_KEPT).map((r) => r._id);
        await AllocationAssignment.deleteMany({ run: { $in: excessIds } });
        await AllocationRun.deleteMany({ _id: { $in: excessIds } });
      }
    }
  }

  if (validationError) {
    const error = new Error(`Allocation Invariant Validation Failed: ${validationError}`);
    error.status = 500;
    error.runId = createdRun?._id;
    throw error;
  }

  return {
    runId: createdRun?._id,
    status: createdRun?.status || "draft",
    options,
    stats,
    assignments,
    waitlist: combinedWaitlist,
    unallocated: unallocatedList,
  };
}

/**
 * Lists allocation runs with pagination.
 */
export async function listRuns({ page = 1, limit = 10 } = {}) {
  await connectDB();
  const skip = (Math.max(1, page) - 1) * limit;

  const [runs, total] = await Promise.all([
    AllocationRun.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .lean(),
    AllocationRun.countDocuments(),
  ]);

  return {
    runs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Retrieves a single allocation run by ID.
 */
export async function getRun(runId) {
  await connectDB();
  const run = await AllocationRun.findById(runId)
    .populate("createdBy", "name email")
    .lean();

  if (!run) {
    const error = new Error("Allocation run not found");
    error.status = 404;
    throw error;
  }

  return run;
}

/**
 * Lists assignments belonging to an allocation run with filters and search.
 */
export async function listAssignments(runId, { status, hostelId, search, page = 1, limit = 20 } = {}) {
  await connectDB();

  const query = { run: runId };
  if (status && status !== "all") {
    query.status = status;
  }
  if (hostelId && hostelId !== "all") {
    query.hostel = hostelId;
  }

  const skip = (Math.max(1, page) - 1) * limit;

  let assignmentsQuery = AllocationAssignment.find(query)
    .populate("members", "name registrationNumber course department year gender")
    .populate("room", "roomNumber floor capacity roomType")
    .populate("hostel", "code name gender")
    .sort({ order: 1 });

  // If text search on member names or registration numbers is present:
  let assignments = await assignmentsQuery.lean();

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    assignments = assignments.filter((a) => {
      const matchMember = (a.members || []).some(
        (m) =>
          (m.name && m.name.toLowerCase().includes(term)) ||
          (m.registrationNumber && m.registrationNumber.toLowerCase().includes(term))
      );
      const matchRoom = a.room && String(a.room.roomNumber).toLowerCase().includes(term);
      const matchHostel = a.hostel && (a.hostel.code.toLowerCase().includes(term) || a.hostel.name.toLowerCase().includes(term));
      return matchMember || matchRoom || matchHostel;
    });
  }

  const totalFiltered = assignments.length;
  const paginated = assignments.slice(skip, skip + limit);

  return {
    assignments: paginated,
    pagination: {
      total: totalFiltered,
      page,
      limit,
      pages: Math.ceil(totalFiltered / limit),
    },
  };
}

/**
 * Retrieves unallocated students for a run.
 */
export async function listUnallocated(runId) {
  await connectDB();
  const run = await AllocationRun.findById(runId)
    .populate("unallocated.user", "name registrationNumber course department year gender email")
    .lean();

  if (!run) {
    const error = new Error("Allocation run not found");
    error.status = 404;
    throw error;
  }

  return run.unallocated || [];
}

/**
 * Deletes a draft or failed allocation run and its associated assignments.
 */
export async function deleteDraftRun(runId) {
  await connectDB();
  const run = await AllocationRun.findById(runId);
  if (!run) {
    const error = new Error("Allocation run not found");
    error.status = 404;
    throw error;
  }

  if (run.status !== "draft" && run.status !== "failed") {
    const error = new Error(`Cannot delete run in "${run.status}" status. Only draft or failed runs may be deleted.`);
    error.status = 400;
    throw error;
  }

  await AllocationAssignment.deleteMany({ run: run._id });
  await AllocationRun.deleteOne({ _id: run._id });

  return { success: true, deletedRunId: runId };
}
