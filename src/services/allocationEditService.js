/**
 * Allocation Edit Service (Phase 6 - Draft Run Customization)
 * 
 * Orchestrates manual administrator adjustments on draft allocation runs:
 * - Move units between free rooms
 * - Swap rooms between assigned units of equal capacity
 * - Swap members across units of the same gender (with deal-breaker override safeguards)
 * - Move units to waitlist ("unassign")
 * - Assign waitlisted units into free rooms
 * 
 * INVARIANTS:
 * - Only operates on runs with status === "draft".
 * - Persists ONLY changed documents (efficient delta updates).
 * - Appends descriptive entries to run.editLog (capped at MAX_EDIT_LOG_ENTRIES).
 * - Requires a non-empty overrideReason (>= 5 chars) for deal-breaker overrides.
 */

import connectDB from "../lib/db.js";
import AllocationRun from "../models/AllocationRun.js";
import AllocationAssignment from "../models/AllocationAssignment.js";
import Room from "../models/Room.js";
import Hostel from "../models/Hostel.js";
import User from "../models/User.js";
import Preference from "../models/Preference.js";
import RoommateGroup from "../models/RoommateGroup.js";
import { calculateCompatibility } from "./matching/scoreEngine.js";
import { DEFAULT_WEIGHTS, YEAR_BONUS } from "../config/matching.js";
import { MAX_EDIT_LOG_ENTRIES } from "../config/allocation.js";
import {
  moveUnit as pureMoveUnit,
  swapRooms as pureSwapRooms,
  swapMembers as pureSwapMembers,
  unassignUnit as pureUnassignUnit,
  assignWaitlisted as pureAssignWaitlisted,
} from "./allocation/editOperations.js";
import {
  evaluateRooms,
  buildRandomBaseline,
  summarizePreferenceSatisfaction,
} from "./allocation/metrics.js";
import { floorMatchesBand } from "./roomPreferences/preferenceLogic.js";
import { roomMeetsHardConstraints } from "./allocation/roomPlacement.js";

/**
 * Loads and constructs hydrated context for a draft allocation run.
 */
async function loadRunContext(runId) {
  await connectDB();

  const run = await AllocationRun.findById(runId);
  if (!run) {
    const err = new Error("Allocation run not found");
    err.status = 404;
    throw err;
  }

  if (run.status !== "draft") {
    const err = new Error(`Only draft allocation runs can be modified (current status: "${run.status}")`);
    err.status = 409;
    throw err;
  }

  const assignmentDocs = await AllocationAssignment.find({ run: runId })
    .populate("room")
    .populate("hostel")
    .lean();

  // Load all member users and their preferences
  const allMemberIds = [];
  assignmentDocs.forEach((a) => {
    (a.members || []).forEach((m) => allMemberIds.push(m));
  });

  const [users, preferences, rooms, hostels] = await Promise.all([
    User.find({ _id: { $in: allMemberIds } }).lean(),
    Preference.find({ student: { $in: allMemberIds } }).lean(),
    Room.find({ isActive: true }).lean(),
    Hostel.find().lean(),
  ]);

  const prefMap = new Map();
  preferences.forEach((p) => prefMap.set(String(p.student), p));

  const userMap = new Map();
  users.forEach((u) => {
    userMap.set(String(u._id), {
      id: String(u._id),
      _id: u._id,
      name: u.name,
      gender: u.gender,
      year: u.year || 1,
      course: u.course || "",
      department: u.department || "",
      registrationNumber: u.registrationNumber || "",
      isDemo: Boolean(u.isDemo),
      preferences: prefMap.get(String(u._id)) || {},
    });
  });

  // Reconstruct units array
  const units = assignmentDocs.map((a) => {
    const members = (a.members || []).map((mId) => userMap.get(String(mId)) || { id: String(mId), _id: mId });
    return {
      unitId: String(a._id),
      id: String(a._id),
      kind: a.unitKind,
      sourceGroupId: a.sourceGroup ? String(a.sourceGroup) : null,
      size: a.size,
      gender: members[0]?.gender || "male",
      members,
      roomPreferences: {
        preferredHostels: (a.hostel ? [String(a.hostel._id || a.hostel)] : []),
        acType: a.acMatch !== null ? (a.acMatch ? "ac" : "non-ac") : "no-preference",
        floorPreference: "any",
      },
      groupAverage: a.groupAverage,
      groupLowest: a.groupLowest,
    };
  });

  // Reconstruct assignments array formatted for pure functions
  const assignments = assignmentDocs.map((a) => ({
    _id: a._id,
    unitId: String(a._id),
    unitKind: a.unitKind,
    sourceGroup: a.sourceGroup,
    members: a.members,
    status: a.status,
    waitlistReason: a.waitlistReason,
    roomId: a.room ? String(a.room._id || a.room.id) : null,
    room: a.room
      ? {
          ...a.room,
          id: String(a.room._id || a.room.id),
          hostelId: String(a.room.hostel?._id || a.room.hostel || a.hostel?._id || a.hostel),
        }
      : null,
    hostelId: a.hostel ? String(a.hostel._id || a.hostel.id) : null,
    hostel: a.hostel ? { ...a.hostel, id: String(a.hostel._id || a.hostel.id) } : null,
    size: a.size,
    groupAverage: a.groupAverage,
    groupLowest: a.groupLowest,
    hostelRank: a.hostelRank,
    acMatch: a.acMatch,
    floorMatch: a.floorMatch,
    preferenceScore: a.preferenceScore,
    round: a.round,
    order: a.order,
    edited: a.edited || false,
    overridden: a.overridden || false,
    overrideReason: a.overrideReason || null,
  }));

  // Standardized rooms for pure logic
  const pureRooms = rooms.map((r) => ({
    ...r,
    id: String(r._id),
    hostelId: String(r.hostel?._id || r.hostel),
  }));

  const pureHostels = hostels.map((h) => ({
    ...h,
    id: String(h._id),
  }));

  const weights = run.weightsSnapshot?.weights || DEFAULT_WEIGHTS;
  const yearBonus = run.weightsSnapshot?.yearBonus || YEAR_BONUS;
  const scoreFn = (a, b) => calculateCompatibility(a, b, weights, yearBonus);

  return { run, units, assignments, rooms: pureRooms, hostels: pureHostels, scoreFn, userMap };
}

/**
 * Recomputes and updates summary metrics on an allocation run.
 */
async function recomputeAndSaveRunMetrics(run, assignments, units, rooms, hostels, scoreFn, logEntry) {
  const assignedList = assignments.filter((a) => a.status === "assigned" && a.roomId);
  const waitlistList = assignments.filter((a) => a.status === "waitlisted");

  // Pair evaluation on assigned rooms
  const roomMembersList = [];
  const assignedStudentsByGender = { male: [], female: [], other: [] };
  const roomCapacitiesByGender = { male: [], female: [], other: [] };

  const unitMap = new Map();
  units.forEach((u) => unitMap.set(String(u.unitId || u.id), u));

  for (const assign of assignedList) {
    const unit = unitMap.get(String(assign.unitId)) || assign.unit;
    if (unit && unit.members) {
      roomMembersList.push(unit.members);
      const gender = unit.gender || unit.members[0]?.gender || "male";
      if (!assignedStudentsByGender[gender]) assignedStudentsByGender[gender] = [];
      if (!roomCapacitiesByGender[gender]) roomCapacitiesByGender[gender] = [];

      unit.members.forEach((m) => assignedStudentsByGender[gender].push(m));
      roomCapacitiesByGender[gender].push(unit.size);
    }
  }

  const roomMetrics = evaluateRooms(roomMembersList, scoreFn);

  // Preference satisfaction
  const satisfaction = summarizePreferenceSatisfaction(assignedList, unitMap);

  // Random baseline
  const seed = run.options?.seed || "baseline_seed";
  const baselineTrials = run.options?.baselineTrials || 20;
  const baseline = buildRandomBaseline(
    assignedStudentsByGender,
    roomCapacitiesByGender,
    scoreFn,
    seed,
    baselineTrials
  );

  // Update run stats
  run.stats = {
    ...run.stats,
    assignedCount: assignedList.length,
    assignedStudentsCount: roomMetrics.studentsCount,
    waitlistCount: waitlistList.length,
    avgPairScore: roomMetrics.avgPairScore,
    lowestPairScore: roomMetrics.lowestPairScore,
    roomsWithConflict: roomMetrics.roomsWithConflict,
    goodOrAbovePercent: roomMetrics.goodOrAbovePercent,
    preferenceSatisfaction: satisfaction,
    baseline,
  };

  run.waitlistCount = waitlistList.length;
  run.edited = true;

  // Count overrides across assignments
  const overrideCount = assignments.filter((a) => a.overridden === true).length;
  run.overrideCount = overrideCount;

  // Append to editLog
  if (logEntry) {
    const logArray = run.editLog || [];
    logArray.push({
      admin: logEntry.admin || null,
      action: logEntry.action,
      summary: logEntry.summary,
      at: new Date(),
    });

    if (logArray.length > MAX_EDIT_LOG_ENTRIES) {
      run.editLog = logArray.slice(logArray.length - MAX_EDIT_LOG_ENTRIES);
    } else {
      run.editLog = logArray;
    }
  }

  await run.save();
}

/**
 * 1. Move Unit
 */
export async function moveUnit(adminId, runId, { unitId, targetRoomId }) {
  const { run, units, assignments, rooms, hostels, scoreFn } = await loadRunContext(runId);

  const res = pureMoveUnit(assignments, units, rooms, hostels, unitId, targetRoomId, scoreFn);
  if (!res.ok) {
    const err = new Error(res.error);
    err.status = 400;
    throw err;
  }

  const targetRoom = rooms.find((r) => r.id === String(targetRoomId));
  const unit = units.find((u) => u.unitId === String(unitId));

  // Persist modified assignment document
  const updatedAssign = res.newAssignments.find((a) => a.unitId === String(unitId));
  await AllocationAssignment.findByIdAndUpdate(unitId, {
    $set: {
      room: targetRoomId,
      hostel: updatedAssign.hostelId,
      hostelRank: updatedAssign.hostelRank,
      acMatch: updatedAssign.acMatch,
      floorMatch: updatedAssign.floorMatch,
      preferenceScore: updatedAssign.preferenceScore,
      edited: true,
    },
  });

  const memberNames = (unit.members || []).map((m) => m.name).join(", ");
  const summary = `Moved Group of ${unit.size} (${memberNames}) to room ${targetRoom?.roomNumber || targetRoomId}`;

  await recomputeAndSaveRunMetrics(run, res.newAssignments, units, rooms, hostels, scoreFn, {
    admin: adminId,
    action: "move",
    summary,
  });

  return {
    success: true,
    message: summary,
    affectedUnitIds: res.affectedUnitIds,
    warnings: res.warnings,
  };
}

/**
 * 2. Swap Rooms
 */
export async function swapRooms(adminId, runId, { unitIdA, unitIdB }) {
  const { run, units, assignments, rooms, hostels, scoreFn } = await loadRunContext(runId);

  const res = pureSwapRooms(assignments, units, rooms, hostels, unitIdA, unitIdB, scoreFn);
  if (!res.ok) {
    const err = new Error(res.error);
    err.status = 400;
    throw err;
  }

  const newA = res.newAssignments.find((a) => a.unitId === String(unitIdA));
  const newB = res.newAssignments.find((a) => a.unitId === String(unitIdB));

  await Promise.all([
    AllocationAssignment.findByIdAndUpdate(unitIdA, {
      $set: {
        room: newA.roomId,
        hostel: newA.hostelId,
        hostelRank: newA.hostelRank,
        acMatch: newA.acMatch,
        floorMatch: newA.floorMatch,
        preferenceScore: newA.preferenceScore,
        edited: true,
      },
    }),
    AllocationAssignment.findByIdAndUpdate(unitIdB, {
      $set: {
        room: newB.roomId,
        hostel: newB.hostelId,
        hostelRank: newB.hostelRank,
        acMatch: newB.acMatch,
        floorMatch: newB.floorMatch,
        preferenceScore: newB.preferenceScore,
        edited: true,
      },
    }),
  ]);

  const roomA = rooms.find((r) => r.id === String(newB.roomId));
  const roomB = rooms.find((r) => r.id === String(newA.roomId));
  const summary = `Swapped rooms between Unit ${unitIdA} (${roomB?.roomNumber}) and Unit ${unitIdB} (${roomA?.roomNumber})`;

  await recomputeAndSaveRunMetrics(run, res.newAssignments, units, rooms, hostels, scoreFn, {
    admin: adminId,
    action: "swap_rooms",
    summary,
  });

  return {
    success: true,
    message: summary,
    affectedUnitIds: res.affectedUnitIds,
    warnings: res.warnings,
  };
}

/**
 * 3. Swap Members
 */
export async function swapMembers(
  adminId,
  runId,
  { unitIdA, memberIdA, unitIdB, memberIdB, confirmOverride, overrideReason }
) {
  const { run, units, assignments, rooms, hostels, scoreFn, userMap } = await loadRunContext(runId);

  if (confirmOverride && (!overrideReason || overrideReason.trim().length < 5)) {
    const err = new Error("An override reason of at least 5 characters is required to bypass deal-breaker conflicts.");
    err.status = 400;
    throw err;
  }

  const res = pureSwapMembers(
    assignments,
    units,
    rooms,
    hostels,
    unitIdA,
    memberIdA,
    unitIdB,
    memberIdB,
    scoreFn,
    { confirmOverride, overrideReason }
  );

  if (!res.ok) {
    if (res.requiresOverride) {
      return {
        success: false,
        requiresOverride: true,
        conflictingPairs: res.conflictingPairs,
        message: res.error,
      };
    }
    const err = new Error(res.error);
    err.status = 400;
    throw err;
  }

  const newA = res.newAssignments.find((a) => a.unitId === String(unitIdA));
  const newB = res.newAssignments.find((a) => a.unitId === String(unitIdB));

  await Promise.all([
    AllocationAssignment.findByIdAndUpdate(unitIdA, {
      $set: {
        members: newA.members,
        groupAverage: newA.groupAverage,
        groupLowest: newA.groupLowest,
        hostelRank: newA.hostelRank,
        acMatch: newA.acMatch,
        floorMatch: newA.floorMatch,
        preferenceScore: newA.preferenceScore,
        edited: true,
        overridden: newA.overridden,
        overrideReason: newA.overrideReason,
      },
    }),
    AllocationAssignment.findByIdAndUpdate(unitIdB, {
      $set: {
        members: newB.members,
        groupAverage: newB.groupAverage,
        groupLowest: newB.groupLowest,
        hostelRank: newB.hostelRank,
        acMatch: newB.acMatch,
        floorMatch: newB.floorMatch,
        preferenceScore: newB.preferenceScore,
        edited: true,
        overridden: newB.overridden,
        overrideReason: newB.overrideReason,
      },
    }),
  ]);

  const nameA = userMap.get(String(memberIdA))?.name || memberIdA;
  const nameB = userMap.get(String(memberIdB))?.name || memberIdB;
  const summary = `Swapped student ${nameA} with ${nameB} between Unit ${unitIdA} and Unit ${unitIdB}`;

  await recomputeAndSaveRunMetrics(run, res.newAssignments, res.newUnits, rooms, hostels, scoreFn, {
    admin: adminId,
    action: "swap_members",
    summary,
  });

  return {
    success: true,
    message: summary,
    affectedUnitIds: res.affectedUnitIds,
    warnings: res.warnings,
  };
}

/**
 * 4. Unassign Unit (Move to Waitlist)
 */
export async function unassignUnit(adminId, runId, { unitId }) {
  const { run, units, assignments, rooms, hostels, scoreFn } = await loadRunContext(runId);

  const res = pureUnassignUnit(assignments, units, rooms, hostels, unitId);
  if (!res.ok) {
    const err = new Error(res.error);
    err.status = 400;
    throw err;
  }

  await AllocationAssignment.findByIdAndUpdate(unitId, {
    $set: {
      status: "waitlisted",
      waitlistReason: "manually_unassigned",
      room: null,
      hostel: null,
      hostelRank: null,
      acMatch: null,
      floorMatch: null,
      preferenceScore: 0,
      round: null,
      edited: true,
    },
  });

  const unit = units.find((u) => u.unitId === String(unitId));
  const memberNames = (unit.members || []).map((m) => m.name).join(", ");
  const summary = `Unassigned Unit ${unitId} (${memberNames}) and freed room ${res.deltas.freedRoomId}`;

  await recomputeAndSaveRunMetrics(run, res.newAssignments, units, rooms, hostels, scoreFn, {
    admin: adminId,
    action: "unassign",
    summary,
  });

  return {
    success: true,
    message: summary,
    affectedUnitIds: res.affectedUnitIds,
    freedRoomId: res.deltas.freedRoomId,
  };
}

/**
 * 5. Assign Waitlisted Unit
 */
export async function assignWaitlisted(adminId, runId, { unitId, targetRoomId }) {
  const { run, units, assignments, rooms, hostels, scoreFn } = await loadRunContext(runId);

  const res = pureAssignWaitlisted(assignments, units, rooms, hostels, unitId, targetRoomId, scoreFn);
  if (!res.ok) {
    const err = new Error(res.error);
    err.status = 400;
    throw err;
  }

  const updatedAssign = res.newAssignments.find((a) => a.unitId === String(unitId));
  const targetRoom = rooms.find((r) => r.id === String(targetRoomId));

  await AllocationAssignment.findByIdAndUpdate(unitId, {
    $set: {
      status: "assigned",
      waitlistReason: null,
      room: targetRoomId,
      hostel: updatedAssign.hostelId,
      hostelRank: updatedAssign.hostelRank,
      acMatch: updatedAssign.acMatch,
      floorMatch: updatedAssign.floorMatch,
      preferenceScore: updatedAssign.preferenceScore,
      round: 4,
      edited: true,
    },
  });

  const unit = units.find((u) => u.unitId === String(unitId));
  const memberNames = (unit.members || []).map((m) => m.name).join(", ");
  const summary = `Assigned waitlisted Unit ${unitId} (${memberNames}) to room ${targetRoom?.roomNumber || targetRoomId}`;

  await recomputeAndSaveRunMetrics(run, res.newAssignments, units, rooms, hostels, scoreFn, {
    admin: adminId,
    action: "assign_waitlisted",
    summary,
  });

  return {
    success: true,
    message: summary,
    affectedUnitIds: res.affectedUnitIds,
    assignedRoomId: targetRoomId,
  };
}

/**
 * Retrieves valid edit candidate options for the admin UI modal.
 * 
 * @param {string} runId 
 * @param {string} unitId 
 * @param {"move" | "swap_rooms" | "swap_members" | "assign_waitlisted"} mode 
 * @returns {Promise<object>}
 */
export async function getEditCandidates(runId, unitId, mode) {
  const { units, assignments, rooms, hostels } = await loadRunContext(runId);

  const unit = units.find((u) => u.unitId === String(unitId));
  if (!unit) {
    const err = new Error(`Unit "${unitId}" not found`);
    err.status = 404;
    throw err;
  }

  const currentAssign = assignments.find((a) => a.unitId === String(unitId));

  if (mode === "move" || mode === "assign_waitlisted") {
    // Collect assigned room IDs in this draft
    const assignedRoomIds = new Set();
    assignments.forEach((a) => {
      if (a.status === "assigned" && a.roomId && String(a.unitId) !== String(unitId)) {
        assignedRoomIds.add(a.roomId);
      }
    });

    const hostelMap = new Map();
    hostels.forEach((h) => hostelMap.set(h.id, h));

    // Find free rooms with matching capacity that meet hard constraints
    const validRoomsByHostel = {};

    for (const r of rooms) {
      if (r.capacity !== unit.size) continue;
      if (assignedRoomIds.has(r.id)) continue;
      if (r.currentOccupancy && r.currentOccupancy > 0) continue;
      if (r.status === "maintenance") continue;

      const hostel = hostelMap.get(r.hostelId);
      if (!hostel || hostel.isActive === false) continue;

      if (!roomMeetsHardConstraints(r, hostel, unit.members)) continue;

      const prefs = unit.roomPreferences || {};
      const acMismatch = prefs.acType === "ac" && r.roomType !== "AC";
      const floorMatch = prefs.floorPreference && prefs.floorPreference !== "any"
        ? floorMatchesBand(r.floor, hostel.totalFloors, prefs.floorPreference)
        : true;

      const hostelCode = hostel.code || hostel.name;
      if (!validRoomsByHostel[hostelCode]) {
        validRoomsByHostel[hostelCode] = {
          hostelId: hostel.id,
          hostelName: hostel.name,
          hostelCode,
          rooms: [],
        };
      }

      validRoomsByHostel[hostelCode].rooms.push({
        id: r.id,
        roomNumber: r.roomNumber,
        floor: r.floor,
        roomType: r.roomType,
        capacity: r.capacity,
        acMismatch,
        floorMismatch: !floorMatch,
      });
    }

    return {
      unitId,
      currentRoomId: currentAssign?.roomId || null,
      hostels: Object.values(validRoomsByHostel),
    };
  }

  if (mode === "swap_rooms") {
    // Valid swap partners: other assigned units with the SAME size
    const partners = [];
    const hostelMap = new Map();
    hostels.forEach((h) => hostelMap.set(h.id, h));

    for (const a of assignments) {
      if (String(a.unitId) === String(unitId)) continue;
      if (a.status !== "assigned" || !a.roomId) continue;

      const partnerUnit = units.find((u) => u.unitId === String(a.unitId));
      if (!partnerUnit || partnerUnit.size !== unit.size) continue;

      // Check if both satisfy each other's room hard constraints
      const roomA = rooms.find((r) => r.id === String(currentAssign?.roomId));
      const roomB = rooms.find((r) => r.id === String(a.roomId));
      const hostelA = roomA ? hostelMap.get(roomA.hostelId) : null;
      const hostelB = roomB ? hostelMap.get(roomB.hostelId) : null;

      if (!roomA || !roomB || !hostelA || !hostelB) continue;

      const unitACanTakeB = roomMeetsHardConstraints(roomB, hostelB, unit.members);
      const unitBCanTakeA = roomMeetsHardConstraints(roomA, hostelA, partnerUnit.members);

      if (!unitACanTakeB || !unitBCanTakeA) continue;

      partners.push({
        unitId: a.unitId,
        roomNumber: roomB.roomNumber,
        hostelName: hostelB.name,
        roomType: roomB.roomType,
        floor: roomB.floor,
        membersCount: partnerUnit.members.length,
        members: partnerUnit.members.map((m) => ({ id: m.id, name: m.name })),
        groupAverage: a.groupAverage,
      });
    }

    return {
      unitId,
      partners,
    };
  }

  if (mode === "swap_members") {
    // Valid partners: other units of the same gender
    const partners = [];
    for (const a of assignments) {
      if (String(a.unitId) === String(unitId)) continue;
      const partnerUnit = units.find((u) => u.unitId === String(a.unitId));
      if (!partnerUnit || partnerUnit.gender !== unit.gender) continue;

      partners.push({
        unitId: a.unitId,
        status: a.status,
        roomNumber: a.room?.roomNumber || "Waitlisted",
        members: (partnerUnit.members || []).map((m) => ({
          id: m.id,
          name: m.name,
          year: m.year,
          gender: m.gender,
        })),
        groupAverage: a.groupAverage,
      });
    }

    return {
      unitId,
      members: (unit.members || []).map((m) => ({
        id: m.id,
        name: m.name,
        year: m.year,
        gender: m.gender,
      })),
      otherUnits: partners,
    };
  }

  return {};
}
