/**
 * Allocation Publication & Rollback Service (Phase 6 - Official Assignment Engine)
 * 
 * Orchestrates atomic, transactional transitions between:
 * Draft -> Publishing -> Published -> Rolled Back.
 * 
 * CORE GUARANTEES:
 * 1. ATOMIC WRITES: Uses MongoDB session.withTransaction for zero partial state leakage.
 * 2. CONDITIONAL CONCURRENCY: Uses findOneAndUpdate lock state "publishing" and conditional room updates.
 * 3. REVERSIBLE: Stores comprehensive publishSnapshot to restore exact group structures and room occupancy.
 * 4. STALE INVENTORY DISCARD: When a run is published, every other draft run is marked "discarded".
 */

import mongoose from "mongoose";
import connectDB from "../lib/db.js";
import AllocationRun from "../models/AllocationRun.js";
import AllocationAssignment from "../models/AllocationAssignment.js";
import Allocation from "../models/Allocation.js";
import Room from "../models/Room.js";
import Hostel from "../models/Hostel.js";
import User from "../models/User.js";
import Preference from "../models/Preference.js";
import RoommateGroup from "../models/RoommateGroup.js";
import GroupInvitation from "../models/GroupInvitation.js";
import AllocationIntent from "../models/AllocationIntent.js";
import { buildPublishPlan } from "./allocation/publishPlan.js";
import { buildRollbackPlan } from "./allocation/rollbackPlan.js";

/**
 * Loads required live database state for plan verification.
 */
async function loadLivePublicationState(runId, session = null) {
  const queryOptions = session ? { session } : {};

  const run = await AllocationRun.findById(runId, null, queryOptions);
  if (!run) {
    const err = new Error("Allocation run not found");
    err.status = 404;
    throw err;
  }

  const assignmentDocs = await AllocationAssignment.find({ run: runId }, null, queryOptions).lean();

  const allMemberIds = [];
  assignmentDocs.forEach((a) => {
    (a.members || []).forEach((m) => allMemberIds.push(m));
  });

  // Sequential queries to respect MongoDB session concurrency restrictions
  const liveRooms = await Room.find({}, null, queryOptions).lean();
  const liveGroups = await RoommateGroup.find({}, null, queryOptions).lean();
  const liveHostels = await Hostel.find({}, null, queryOptions).lean();
  const liveStudents = await User.find({ _id: { $in: allMemberIds } }, null, queryOptions).lean();
  const activeAllocations = await Allocation.find({ status: "active" }, null, queryOptions).select("student").lean();

  const activeAllocatedStudentIds = new Set(activeAllocations.map((a) => String(a.student)));

  const prefDocs = await Preference.find({ student: { $in: allMemberIds } }, null, queryOptions).lean();
  const prefMap = new Map();
  prefDocs.forEach((p) => prefMap.set(String(p.student), p));

  const userMap = new Map();
  liveStudents.forEach((u) => {
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

  const units = assignmentDocs.map((a) => {
    const members = (a.members || []).map((mId) => userMap.get(String(mId)) || { id: String(mId), _id: mId, isDemo: false });
    return {
      unitId: String(a._id),
      id: String(a._id),
      kind: a.unitKind,
      sourceGroupId: a.sourceGroup ? String(a.sourceGroup) : null,
      size: a.size,
      gender: members[0]?.gender || "male",
      members,
      roomPreferences: {},
    };
  });

  return {
    run,
    assignmentDocs,
    units,
    liveRooms,
    liveGroups,
    liveHostels,
    liveStudents: Array.from(userMap.values()),
    activeAllocatedStudentIds,
  };
}

/**
 * 1. previewPublish: Builds publish plan against live data without modifying anything.
 * 
 * @param {string} runId 
 * @returns {Promise<object>}
 */
export async function previewPublish(runId) {
  await connectDB();

  const {
    run,
    assignmentDocs,
    units,
    liveRooms,
    liveGroups,
    liveHostels,
    liveStudents,
    activeAllocatedStudentIds,
  } = await loadLivePublicationState(runId);

  if (run.status !== "draft") {
    const err = new Error(`Only draft allocation runs can be previewed for publication (current status: "${run.status}")`);
    err.status = 409;
    throw err;
  }

  const planResult = buildPublishPlan({
    assignments: assignmentDocs,
    units,
    liveRoomsState: liveRooms,
    liveGroupsState: liveGroups,
    liveHostelsState: liveHostels,
    liveStudentsState: liveStudents,
    activeAllocatedStudentIds,
  });

  if (!planResult.ok) {
    return {
      canPublish: false,
      conflicts: planResult.conflicts,
      summary: null,
    };
  }

  const assignedCount = assignmentDocs.filter((a) => a.status === "assigned").length;
  const waitlistedCount = assignmentDocs.filter((a) => a.status === "waitlisted").length;
  const unallocatedCount = run.unallocated?.length || 0;
  const overridesCount = assignmentDocs.filter((a) => a.overridden === true).length;

  let groupsLocked = 0;
  let groupsCreated = 0;
  let groupsFilled = 0;
  let groupsShrunk = 0;

  planResult.plan.groupActions.forEach((action) => {
    if (action.type === "lock_existing") groupsLocked++;
    else if (action.type === "create_and_lock") groupsCreated++;
    else if (action.type === "fill_and_lock") groupsFilled++;
    else if (action.type === "shrink_and_lock") groupsShrunk++;
  });

  return {
    canPublish: true,
    conflicts: [],
    summary: {
      students: planResult.plan.allocationRecords.length,
      rooms: planResult.plan.touchedRoomIds.length,
      groupsLocked,
      groupsCreated,
      groupsFilled,
      groupsShrunk,
      overrides: overridesCount,
      waitlisted: waitlistedCount,
      unallocated: unallocatedCount,
    },
  };
}

/**
 * 2. publishRun: Atomically locks and executes live database writes in a transaction.
 * 
 * @param {string} adminId 
 * @param {string} runId 
 * @param {{ confirmText: string }} options 
 * @returns {Promise<object>}
 */
export async function publishRun(adminId, runId, { confirmText }) {
  await connectDB();

  if (confirmText !== "PUBLISH") {
    const err = new Error('Confirmation string must equal "PUBLISH" to confirm live publication.');
    err.status = 400;
    throw err;
  }

  // STEP 1: Atomic state lock from "draft" to "publishing"
  const lockedRun = await AllocationRun.findOneAndUpdate(
    { _id: runId, status: "draft" },
    { $set: { status: "publishing" } },
    { new: true }
  );

  if (!lockedRun) {
    const existing = await AllocationRun.findById(runId).lean();
    const statusMsg = existing ? existing.status : "not found";
    const err = new Error(`Cannot publish: run is not in "draft" status (current: "${statusMsg}").`);
    err.status = 409;
    throw err;
  }

  // STEP 2: Execute transactional writes
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (sessErr) {
    // If transactions are not supported in current environment
    await AllocationRun.findByIdAndUpdate(runId, { $set: { status: "draft" } });
    const err = new Error(`Database transactions are unavailable: ${sessErr.message}. Aborting publish to prevent partial state.`);
    err.status = 500;
    throw err;
  }

  try {
    let resultPayload = null;
    let executedPlan = null;

    await session.withTransaction(async () => {
      // Re-load live data inside transaction
      const {
        assignmentDocs,
        units,
        liveRooms,
        liveGroups,
        liveHostels,
        liveStudents,
        activeAllocatedStudentIds,
      } = await loadLivePublicationState(runId, session);

      // Re-evaluate plan inside transaction
      const planResult = buildPublishPlan({
        assignments: assignmentDocs,
        units,
        liveRoomsState: liveRooms,
        liveGroupsState: liveGroups,
        liveHostelsState: liveHostels,
        liveStudentsState: liveStudents,
        activeAllocatedStudentIds,
      });

      if (!planResult.ok) {
        const conflictErr = new Error(`Publication aborted due to live state conflicts: ${planResult.conflicts.map((c) => c.message).join("; ")}`);
        conflictErr.conflicts = planResult.conflicts;
        throw conflictErr;
      }

      const plan = planResult.plan;
      executedPlan = plan;

      // 1. CONDITIONAL ROOM INCREMENTS
      // Each room must still have currentOccupancy === 0 and status !== "maintenance"
      const modifiedRoomRecords = [];

      for (const inc of plan.roomIncrements) {
        const liveRoomDoc = await Room.findOne(
          { _id: inc.roomId, currentOccupancy: 0, status: { $ne: "maintenance" } },
          null,
          { session }
        );

        if (!liveRoomDoc) {
          throw new Error(`Room occupancy conflict: room "${inc.roomId}" is either no longer empty or under maintenance.`);
        }

        const newOccupancy = liveRoomDoc.currentOccupancy + inc.add;
        const newStatus = newOccupancy >= liveRoomDoc.capacity ? "full" : "available";

        liveRoomDoc.currentOccupancy = newOccupancy;
        liveRoomDoc.status = newStatus;
        await liveRoomDoc.save({ session });

        modifiedRoomRecords.push(inc.roomId);
      }

      // 2. APPLY GROUP ACTIONS
      const createdGroupIds = [];
      const modifiedGroups = [];
      const groupMappingByUnit = new Map(); // unitId -> RoommateGroup ObjectId

      for (const action of plan.groupActions) {
        if (action.type === "lock_existing") {
          const g = await RoommateGroup.findById(action.groupId, null, { session });
          if (!g) throw new Error(`Group "${action.groupId}" not found`);
          g.status = "locked";
          g.lockedAt = new Date();
          g.allocationRun = runId;
          await g.save({ session });

          modifiedGroups.push({
            groupId: action.groupId,
            previous: action.previous,
          });
          groupMappingByUnit.set(action.unitId, g._id);
        } else if (action.type === "fill_and_lock") {
          const g = await RoommateGroup.findById(action.groupId, null, { session });
          if (!g) throw new Error(`Group "${action.groupId}" not found`);

          const existingMemberIds = new Set(g.members.map((m) => String(m.user)));
          for (const newMId of action.newMembers) {
            if (!existingMemberIds.has(String(newMId))) {
              g.members.push({ user: newMId, joinedAt: new Date() });
            }
          }
          g.targetSize = action.targetSize;
          g.status = "locked";
          g.lockedAt = new Date();
          g.allocationRun = runId;
          await g.save({ session });

          modifiedGroups.push({
            groupId: action.groupId,
            previous: action.previous,
          });
          groupMappingByUnit.set(action.unitId, g._id);
        } else if (action.type === "shrink_and_lock") {
          const g = await RoommateGroup.findById(action.groupId, null, { session });
          if (!g) throw new Error(`Group "${action.groupId}" not found`);

          g.targetSize = action.targetSize;
          g.status = "locked";
          g.lockedAt = new Date();
          g.allocationRun = runId;
          await g.save({ session });

          modifiedGroups.push({
            groupId: action.groupId,
            previous: action.previous,
          });
          groupMappingByUnit.set(action.unitId, g._id);
        } else if (action.type === "create_and_lock") {
          const membersArray = action.members.map((mId) => ({
            user: mId,
            joinedAt: new Date(),
          }));

          const [createdGroup] = await RoommateGroup.create(
            [
              {
                leader: action.leader,
                gender: action.gender,
                targetSize: action.targetSize,
                members: membersArray,
                status: "locked",
                completedAt: new Date(),
                lockedAt: new Date(),
                isDemo: action.isDemo,
                createdByAllocation: true,
                allocationRun: runId,
              },
            ],
            { session }
          );

          createdGroupIds.push(createdGroup._id);
          groupMappingByUnit.set(action.unitId, createdGroup._id);
        }
      }

      // 3. CREATE OFFICIAL ALLOCATION RECORDS
      const allocationDocsToInsert = plan.allocationRecords.map((rec) => ({
        student: rec.student,
        room: rec.room,
        hostel: rec.hostel,
        group: groupMappingByUnit.get(rec.unitId),
        run: runId,
        status: "active",
        allocatedAt: new Date(),
        isDemo: rec.isDemo,
      }));

      const createdAllocations = await Allocation.insertMany(allocationDocsToInsert, { session });
      const allocationIds = createdAllocations.map((a) => a._id);

      // 4. UPDATE ALLOCATION INTENTS
      await AllocationIntent.updateMany(
        { user: { $in: plan.intentUserIds } },
        { $set: { allocatedAt: new Date() } },
        { session }
      );

      // 5. CANCEL PENDING INVITATIONS
      const cancelGroupIds = plan.invitationCancelRules.groupIds || [];
      const cancelStudentIds = plan.invitationCancelRules.studentIds || [];

      const cancelledInvs = await GroupInvitation.find(
        {
          status: "pending",
          $or: [
            { group: { $in: cancelGroupIds } },
            { invitedUser: { $in: cancelStudentIds } },
          ],
        },
        null,
        { session }
      ).select("_id");

      const cancelledInvitationIds = cancelledInvs.map((inv) => inv._id);

      await GroupInvitation.updateMany(
        { _id: { $in: cancelledInvitationIds } },
        { $set: { status: "cancelled" } },
        { session }
      );

      // 6. STORE PUBLISH SNAPSHOT AND MARK RUN PUBLISHED
      const snapshot = {
        createdGroupIds,
        modifiedGroups,
        touchedRoomIds: plan.touchedRoomIds,
        allocationIds,
        intentUserIds: plan.intentUserIds,
        cancelledInvitationIds,
      };

      await AllocationRun.findByIdAndUpdate(
        runId,
        {
          $set: {
            status: "published",
            publishedAt: new Date(),
            publishedBy: adminId,
            publishSnapshot: snapshot,
          },
        },
        { session }
      );

      // 7. MARK EVERY OTHER DRAFT RUN AS DISCARDED
      await AllocationRun.updateMany(
        { _id: { $ne: runId }, status: "draft" },
        { $set: { status: "discarded" } },
        { session }
      );

      resultPayload = {
        publishedRunId: runId,
        studentsAllocated: allocationIds.length,
        roomsOccupied: plan.touchedRoomIds.length,
        groupsLocked: plan.groupActions.length,
      };
    });

    // Post-commit notifications for published run (best-effort, outside transaction)
    try {
      const { notify, notifyMany } = await import("./notificationService.js");

      // 1. Allocation published to allocated students
      if (executedPlan?.allocationRecords?.length > 0) {
        const roomIds = executedPlan.allocationRecords.map((r) => r.room);
        const hostelIds = executedPlan.allocationRecords.map((r) => r.hostel);

        const [rooms, hostels] = await Promise.all([
          Room.find({ _id: { $in: roomIds } }).select("_id roomNumber").lean(),
          Hostel.find({ _id: { $in: hostelIds } }).select("_id name").lean(),
        ]);

        const roomMap = new Map();
        rooms.forEach((r) => roomMap.set(r._id.toString(), r.roomNumber));
        const hostelMap = new Map();
        hostels.forEach((h) => hostelMap.set(h._id.toString(), h.name));

        const byRoomHostel = new Map();
        for (const rec of executedPlan.allocationRecords) {
          const rNum = roomMap.get(rec.room.toString()) || "Assigned Room";
          const hName = hostelMap.get(rec.hostel.toString()) || "Assigned Hostel";
          const key = `${hName}:::${rNum}:::${rec.room.toString()}:::${rec.hostel.toString()}`;
          if (!byRoomHostel.has(key)) {
            byRoomHostel.set(key, {
              hName,
              rNum,
              roomId: rec.room.toString(),
              hostelId: rec.hostel.toString(),
              studentIds: [],
            });
          }
          byRoomHostel.get(key).studentIds.push(rec.student.toString());
        }

        for (const { hName, rNum, roomId, hostelId, studentIds } of byRoomHostel.values()) {
          await notifyMany(
            studentIds,
            "allocation_published",
            { hostelName: hName, roomNumber: rNum },
            {
              dedupeParts: [runId.toString(), "published"],
              data: { runId: runId.toString(), roomId, hostelId },
            }
          );
        }
      }

      // 2. Waitlisted units: allocation_waitlisted
      const waitlistedAssignments = await AllocationAssignment.find({
        run: runId,
        status: "waitlisted",
      }).lean();

      if (waitlistedAssignments.length > 0) {
        for (const assignment of waitlistedAssignments) {
          const waitlistMemberIds = assignment.members.map((m) => m.toString());
          await notifyMany(
            waitlistMemberIds,
            "allocation_waitlisted",
            {
              reason:
                assignment.waitlistReason ||
                "All eligible rooms for your group are currently filled.",
            },
            {
              dedupeParts: [runId.toString(), "waitlisted"],
              data: { runId: runId.toString() },
            }
          );
        }
      }

      // 3. Unallocated students: allocation_unallocated
      const runDoc = await AllocationRun.findById(runId).select("unallocated").lean();
      if (runDoc?.unallocated?.length > 0) {
        for (const unalloc of runDoc.unallocated) {
          await notify(
            unalloc.user,
            "allocation_unallocated",
            {
              reason: unalloc.reason || "No matching room was available during this run.",
              nextStep: "Please review your room preferences or contact the hostel warden office.",
            },
            {
              dedupeParts: [runId.toString(), "unallocated"],
              data: { runId: runId.toString() },
            }
          );
        }
      }
    } catch (notifErr) {
      console.error("[Publish Run Notifications Error]:", notifErr.message);
    }

    return {
      success: true,
      message: "Allocation run published successfully.",
      ...resultPayload,
    };
  } catch (err) {
    // Revert lock back to draft
    await AllocationRun.findByIdAndUpdate(runId, { $set: { status: "draft" } });
    err.status = err.status || 400;
    throw err;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

/**
 * 3. rollbackRun: Atomically reverts a published run using its publication snapshot.
 * 
 * @param {string} adminId 
 * @param {string} runId 
 * @param {{ confirmText: string }} options 
 * @returns {Promise<object>}
 */
export async function rollbackRun(adminId, runId, { confirmText }) {
  await connectDB();

  if (confirmText !== "ROLLBACK") {
    const err = new Error('Confirmation string must equal "ROLLBACK" to execute rollback.');
    err.status = 400;
    throw err;
  }

  const run = await AllocationRun.findById(runId);
  if (!run) {
    const err = new Error("Allocation run not found");
    err.status = 404;
    throw err;
  }

  if (run.status !== "published") {
    const err = new Error(`Only published allocation runs can be rolled back (current: "${run.status}").`);
    err.status = 409;
    throw err;
  }

  // Must be the latest published run
  const latestPublished = await AllocationRun.findOne({ status: "published" })
    .sort({ publishedAt: -1 })
    .lean();

  const isLatest = latestPublished && String(latestPublished._id) === String(runId);
  if (!isLatest) {
    const err = new Error("Only the latest published allocation run can be rolled back.");
    err.status = 409;
    throw err;
  }

  let session = null;
  let rolledBackStudentIds = [];
  try {
    session = await mongoose.startSession();
  } catch (sessErr) {
    const err = new Error(`Database transactions are unavailable: ${sessErr.message}`);
    err.status = 500;
    throw err;
  }

  try {
    await session.withTransaction(async () => {
      const snapshot = run.publishSnapshot;

      // Load live state sequentially to respect MongoDB transaction session concurrency restrictions
      const liveRooms = await Room.find({ _id: { $in: snapshot.touchedRoomIds } }, null, { session }).lean();
      const liveGroups = await RoommateGroup.find(
        {
          _id: {
            $in: [
              ...(snapshot.createdGroupIds || []),
              ...(snapshot.modifiedGroups || []).map((m) => m.groupId),
            ],
          },
        },
        null,
        { session }
      ).lean();
      const liveAllocations = await Allocation.find({ _id: { $in: snapshot.allocationIds } }, null, { session }).lean();
      rolledBackStudentIds = liveAllocations.map((a) => a.student.toString());

      const planResult = buildRollbackPlan(snapshot, {
        isLatestPublishedRun: true,
        rooms: liveRooms,
        groups: liveGroups,
        allocations: liveAllocations,
      });

      if (!planResult.ok) {
        const err = new Error(`Rollback aborted due to state drift: ${planResult.conflicts.map((c) => c.message).join("; ")}`);
        err.conflicts = planResult.conflicts;
        throw err;
      }

      const plan = planResult.plan;

      // 1. DECREMENT ROOM OCCUPANCY
      for (const dec of plan.roomDecrements) {
        await Room.findByIdAndUpdate(
          dec.roomId,
          {
            $set: {
              currentOccupancy: dec.targetOccupancy,
              status: dec.newStatus,
            },
          },
          { session }
        );
      }

      // 2. CANCEL ALLOCATION RECORDS
      await Allocation.updateMany(
        { _id: { $in: plan.cancelAllocationIds } },
        {
          $set: {
            status: "cancelled",
            cancelReason: "rollback",
            cancelledAt: new Date(),
          },
        },
        { session }
      );

      // 3. RESTORE MODIFIED GROUPS
      for (const restore of plan.restoreGroups) {
        const prev = restore.previous;
        await RoommateGroup.findByIdAndUpdate(
          restore.groupId,
          {
            $set: {
              members: prev.members,
              targetSize: prev.targetSize,
              status: prev.status,
              completedAt: prev.completedAt,
              lockedAt: prev.lockedAt,
              allocationRun: null,
            },
          },
          { session }
        );
      }

      // 4. DISBAND CREATED GROUPS
      if (plan.disbandGroupIds.length > 0) {
        await RoommateGroup.updateMany(
          { _id: { $in: plan.disbandGroupIds } },
          {
            $set: {
              status: "disbanded",
              disbandedAt: new Date(),
            },
          },
          { session }
        );
      }

      // 5. CLEAR ALLOCATION INTENTS
      if (plan.clearIntentUserIds.length > 0) {
        await AllocationIntent.updateMany(
          { user: { $in: plan.clearIntentUserIds } },
          { $set: { allocatedAt: null } },
          { session }
        );
      }

      // 6. MARK RUN AS ROLLED_BACK
      await AllocationRun.findByIdAndUpdate(
        runId,
        {
          $set: {
            status: "rolled_back",
            rolledBackAt: new Date(),
            rolledBackBy: adminId,
          },
        },
        { session }
      );
    });

    // Post-commit notification: allocation_rolled_back to students with active allocation in that run (best-effort)
    try {
      const { notifyMany } = await import("./notificationService.js");
      if (rolledBackStudentIds.length > 0) {
        await notifyMany(
          rolledBackStudentIds,
          "allocation_rolled_back",
          {},
          {
            dedupeParts: [runId.toString(), "rolled_back"],
            data: { runId: runId.toString() },
          }
        );
      }
    } catch (notifErr) {
      console.error("[Rollback Run Notifications Error]:", notifErr.message);
    }

    return {
      success: true,
      message: "Allocation run rolled back successfully. Room occupancy and groups restored.",
    };
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
