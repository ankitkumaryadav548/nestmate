import mongoose from "mongoose";
import connectDB from "../lib/db.js";
import RoommateGroup from "../models/RoommateGroup.js";
import Room from "../models/Room.js";
import Hostel from "../models/Hostel.js";
import User from "../models/User.js";
import Allocation from "../models/Allocation.js";
import AllocationIntent from "../models/AllocationIntent.js";
import Preference from "../models/Preference.js";
import GroupInvitation from "../models/GroupInvitation.js";
import SelectionWindow from "../models/SelectionWindow.js";

import {
  FINALIZE_CONFIRM_TEXT,
  ROOM_SOURCES,
} from "../config/selection.js";
import { effectiveWindowStatus } from "./selection/windowStatus.js";
import { planOpenSeatFilling } from "./selection/openSeatFilling.js";
import { joinRoomedGroup } from "./roomSelectionService.js";
import { notify } from "./notificationService.js";
import { getSettings } from "./matchingService.js";

/**
 * Previews finalize counts before committing.
 * Requires the window to be effectively "closed" (not finalized).
 */
export async function previewFinalize() {
  await connectDB();

  const liveWindow = await SelectionWindow.findOne({ isActive: true }).lean();
  if (!liveWindow) {
    const error = new Error("No active selection window found.");
    error.statusCode = 404;
    throw error;
  }

  const windowStatus = effectiveWindowStatus(liveWindow);
  if (windowStatus !== "closed") {
    const error = new Error(`Window must be closed before previewing finalization (current status: ${windowStatus}).`);
    error.statusCode = 400;
    throw error;
  }

  // 1. Load roomed groups
  const roomedGroups = await RoommateGroup.find({
    selectedRoom: { $ne: null },
    status: { $in: ["forming", "complete", "locked"] },
  })
    .populate("selectedRoom")
    .populate("members.user")
    .lean();

  let totalOpenSeats = 0;
  const groupsForPlanning = [];

  const allMemberUserIds = [];
  for (const g of roomedGroups) {
    for (const m of g.members || []) {
      if (m.user?._id) allMemberUserIds.push(m.user._id);
    }
  }
  const memberPrefs = await Preference.find({ student: { $in: allMemberUserIds } }).lean();
  const memberPrefMap = new Map(memberPrefs.map((p) => [p.student.toString(), p]));

  for (const g of roomedGroups) {
    const targetSize = g.targetSize;
    const membersCount = g.members?.length || 0;
    const openSeats = Math.max(0, targetSize - membersCount);
    totalOpenSeats += openSeats;

    if (openSeats > 0 && g.selectedRoom) {
      groupsForPlanning.push({
        id: g._id.toString(),
        gender: g.gender,
        targetSize,
        openSeats,
        roomClaimedAt: g.roomClaimedAt,
        selectedRoom: g.selectedRoom,
        members: (g.members || []).map((m) => {
          const u = m.user || {};
          return {
            ...u,
            id: u._id ? u._id.toString() : "",
            preferences: memberPrefMap.get(u._id ? u._id.toString() : "") || {},
          };
        }),
      });
    }
  }

  // 2. Load pool students (completed preferences, no active group, no active allocation)
  const [activeAllocStudentIds, activeGroupDocs, completedPrefs] = await Promise.all([
    Allocation.find({ status: "active" }).distinct("student"),
    RoommateGroup.find({ status: { $in: ["forming", "complete", "locked"] } })
      .select("members.user")
      .lean(),
    Preference.find({ completedAt: { $ne: null } }).lean(),
  ]);

  const excludedStudentIds = new Set(activeAllocStudentIds.map((id) => id.toString()));
  activeGroupDocs.forEach((g) => {
    (g.members || []).forEach((m) => {
      if (m.user) excludedStudentIds.add(m.user.toString());
    });
  });

  const prefMap = new Map(completedPrefs.map((p) => [p.student.toString(), p]));
  const eligiblePoolUserIds = completedPrefs
    .map((p) => p.student.toString())
    .filter((id) => !excludedStudentIds.has(id));

  const poolUsers = await User.find({ _id: { $in: eligiblePoolUserIds } }).lean();
  const poolStudents = poolUsers.map((u) => {
    const p = prefMap.get(u._id.toString()) || {};
    return {
      id: u._id.toString(),
      _id: u._id,
      name: u.name,
      gender: u.gender,
      year: u.year,
      roomSize: p.roomSize,
      preferences: p,
      isDemo: Boolean(u.isDemo),
    };
  });

  // 3. Plan open seat filling
  const allHostels = await Hostel.find().lean();
  const allRooms = await Room.find({ _id: { $in: roomedGroups.map((g) => g.selectedRoom?._id).filter(Boolean) } }).lean();
  const settings = await getSettings();

  const plan = planOpenSeatFilling({
    roomedGroups: groupsForPlanning,
    poolStudents,
    weights: settings.weights,
    rooms: allRooms,
    hostels: allHostels,
  });

  const groupsToLock = roomedGroups.filter(
    (g) => g.status === "forming" || g.status === "complete"
  );

  return {
    window: {
      id: liveWindow._id.toString(),
      name: liveWindow.name,
      status: windowStatus,
    },
    roomedGroupsCount: roomedGroups.length,
    groupsToLock: groupsToLock.map((g) => ({
      id: g._id.toString(),
      targetSize: g.targetSize,
      membersCount: g.members?.length || 0,
      roomNumber: g.selectedRoom?.roomNumber,
    })),
    totalOpenSeatsInRoomedGroups: totalOpenSeats,
    eligiblePoolStudentsCount: poolStudents.length,
    planAdditionsCount: plan.additions.length,
    seatsStillOpenTotal: plan.seatsStillOpen.reduce((acc, curr) => acc + curr.count, 0),
    openSeatsToFill: plan.additions.map((a) => ({
      groupId: a.groupId,
      studentId: a.studentId,
      studentName: a.student?.name,
      averageScore: a.average,
    })),
    poolStudentsCount: poolStudents.length,
    plannedAdditionsCount: plan.additions.length,
    unfillableSeatsCount: plan.seatsStillOpen.reduce((sum, s) => sum + s.count, 0),
  };
}

/**
 * Finalizes room selection.
 * Steps:
 * 1. Locks all roomed groups.
 * 2. Auto-fills open seats with compatible pool students.
 * 3. Sets window to finalized and isActive: false.
 * Idempotent and safe to resume if interrupted.
 */
export async function finalizeSelection(adminId, options = {}) {
  await connectDB();

  const confirmText = options?.confirmText ?? FINALIZE_CONFIRM_TEXT;
  if (confirmText !== FINALIZE_CONFIRM_TEXT) {
    const error = new Error(`Confirmation text must exactly match '${FINALIZE_CONFIRM_TEXT}'.`);
    error.statusCode = 400;
    throw error;
  }

  const liveWindow = await SelectionWindow.findOne({ isActive: true });
  if (!liveWindow) {
    const error = new Error("No active selection window found to finalize.");
    error.statusCode = 404;
    throw error;
  }

  const windowStatus = effectiveWindowStatus(liveWindow);
  if (windowStatus !== "closed") {
    const error = new Error(`Window must be closed before finalization (current status: ${windowStatus}).`);
    error.statusCode = 400;
    throw error;
  }

  const startTime = Date.now();

  // 1. Lock every roomed group
  const lockResult = await RoommateGroup.updateMany(
    {
      selectedRoom: { $ne: null },
      status: { $in: ["forming", "complete"] },
    },
    {
      $set: {
        status: "locked",
        lockedAt: new Date(),
      },
    }
  );

  // 2. Compute Open-Seat Fill Plan
  const preview = await previewFinalize();
  const roomedGroups = await RoommateGroup.find({
    selectedRoom: { $ne: null },
    status: { $in: ["forming", "complete", "locked"] },
  })
    .populate("selectedRoom")
    .populate("members.user")
    .lean();

  const groupsForPlanning = [];
  const allMemberUserIdsFin = [];
  for (const g of roomedGroups) {
    for (const m of g.members || []) {
      if (m.user?._id) allMemberUserIdsFin.push(m.user._id);
    }
  }
  const memberPrefsFin = await Preference.find({ student: { $in: allMemberUserIdsFin } }).lean();
  const memberPrefMapFin = new Map(memberPrefsFin.map((p) => [p.student.toString(), p]));

  for (const g of roomedGroups) {
    const targetSize = g.targetSize;
    const membersCount = g.members?.length || 0;
    const openSeats = Math.max(0, targetSize - membersCount);
    if (openSeats > 0 && g.selectedRoom) {
      groupsForPlanning.push({
        id: g._id.toString(),
        gender: g.gender,
        targetSize,
        openSeats,
        roomClaimedAt: g.roomClaimedAt,
        selectedRoom: g.selectedRoom,
        members: (g.members || []).map((m) => {
          const u = m.user || {};
          return {
            ...u,
            id: u._id ? u._id.toString() : "",
            preferences: memberPrefMapFin.get(u._id ? u._id.toString() : "") || {},
          };
        }),
      });
    }
  }

  // Pool students
  const [activeAllocStudentIds, activeGroupDocs, completedPrefs] = await Promise.all([
    Allocation.find({ status: "active" }).distinct("student"),
    RoommateGroup.find({ status: { $in: ["forming", "complete", "locked"] } })
      .select("members.user")
      .lean(),
    Preference.find({ completedAt: { $ne: null } }).lean(),
  ]);

  const excludedStudentIds = new Set(activeAllocStudentIds.map((id) => id.toString()));
  activeGroupDocs.forEach((g) => {
    (g.members || []).forEach((m) => {
      if (m.user) excludedStudentIds.add(m.user.toString());
    });
  });

  const prefMap = new Map(completedPrefs.map((p) => [p.student.toString(), p]));
  const eligiblePoolUserIds = completedPrefs
    .map((p) => p.student.toString())
    .filter((id) => !excludedStudentIds.has(id));

  const poolUsers = await User.find({ _id: { $in: eligiblePoolUserIds } }).lean();
  const poolStudents = poolUsers.map((u) => {
    const p = prefMap.get(u._id.toString()) || {};
    return {
      id: u._id.toString(),
      _id: u._id,
      name: u.name,
      gender: u.gender,
      year: u.year,
      roomSize: p.roomSize,
      preferences: p,
      isDemo: Boolean(u.isDemo),
    };
  });

  const allHostels = await Hostel.find().lean();
  const allRooms = await Room.find({ _id: { $in: roomedGroups.map((g) => g.selectedRoom?._id).filter(Boolean) } }).lean();
  const settings = await getSettings();

  const plan = planOpenSeatFilling({
    roomedGroups: groupsForPlanning,
    poolStudents,
    weights: settings.weights,
    rooms: allRooms,
    hostels: allHostels,
  });

  // 3. Apply EACH addition in its own atomic transaction
  let seatsFilled = 0;
  let skipped = 0;
  const notificationsToSend = [];

  for (const item of plan.additions) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Re-verify student has no allocation
        const alloc = await Allocation.findOne({ student: item.studentId, status: "active" }).session(session);
        if (alloc) {
          skipped += 1;
          return;
        }

        // Add to group membership
        const groupUpdate = await RoommateGroup.updateOne(
          { _id: item.groupId, "members.user": { $ne: item.studentId } },
          {
            $push: {
              members: {
                user: item.studentId,
                joinedAt: new Date(),
              },
            },
          },
          { session }
        );

        if (groupUpdate.matchedCount !== 1) {
          skipped += 1;
          return;
        }

        // Call joinRoomedGroup to increment occupancy, set status, and create allocation
        await joinRoomedGroup(item.groupId, item.studentId, {
          session,
          source: ROOM_SOURCES.SELECTION,
        });

        // Cancel any pending invitations the student had
        await GroupInvitation.updateMany(
          { invitedUser: item.studentId, status: "pending" },
          { $set: { status: "cancelled", respondedAt: new Date() } },
          { session }
        );

        seatsFilled += 1;

        // Fetch room info for notification
        const grp = await RoommateGroup.findById(item.groupId)
          .session(session)
          .populate("selectedRoom")
          .populate("members.user", "name")
          .lean();

        const roomDoc = grp?.selectedRoom;
        const hostelDoc = roomDoc?.hostel ? await Hostel.findById(roomDoc.hostel).session(session).lean() : null;

        // Notify auto-filled student
        notificationsToSend.push({
          userId: item.studentId,
          type: "room_auto_filled",
          params: {
            hostelName: hostelDoc?.name || "Hostel",
            roomNumber: roomDoc?.roomNumber || "Room",
          },
        });

        // Notify existing members
        const otherMemberIds = (grp.members || [])
          .map((m) => m.user?._id?.toString())
          .filter((id) => id && id !== item.studentId);

        for (const mId of otherMemberIds) {
          notificationsToSend.push({
            userId: mId,
            type: "group_member_joined",
            params: {
              name: item.student?.name || "A roommate",
            },
          });
        }
      });
    } catch (err) {
      console.error(`[SelectionFinalizeService] Failed to auto-fill seat for student ${item.studentId}:`, err);
      skipped += 1;
    } finally {
      await session.endSession();
    }
  }

  // 4. Update window document to finalized
  const duration = Date.now() - startTime;
  const seatsStillOpenCount = plan.seatsStillOpen.reduce((acc, curr) => acc + curr.count, 0);
  const finalizeSummary = {
    groupsLocked: lockResult.modifiedCount || lockResult.matchedCount || 0,
    seatsFilled,
    seatsStillOpen: seatsStillOpenCount,
    studentsPlaced: seatsFilled,
    skipped,
    durationMs: duration,
    finalizedAt: new Date(),
  };

  liveWindow.finalizedAt = new Date();
  liveWindow.isActive = false;
  liveWindow.finalizeSummary = finalizeSummary;
  liveWindow.updatedBy = adminId;
  await liveWindow.save();

  // Send notifications post-commit
  for (const n of notificationsToSend) {
    notify(n.userId, n.type, n.params).catch((err) =>
      console.error("[SelectionFinalizeService] Notification delivery error:", err)
    );
  }

  return {
    success: true,
    lockedCount: lockResult.modifiedCount || lockResult.matchedCount || 0,
    autoFilledCount: seatsFilled,
    groupsLocked: lockResult.modifiedCount || lockResult.matchedCount || 0,
    seatsFilled,
    summary: finalizeSummary,
  };
}

/**
 * Admin override to release a group's room at any time.
 * Requires a reason of at least 5 characters.
 */
export async function adminReleaseRoom(adminId, groupId, reason) {
  await connectDB();

  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    const error = new Error("A valid reason of at least 5 characters is required to release the room.");
    error.statusCode = 400;
    throw error;
  }

  const group = await RoommateGroup.findById(groupId).populate("selectedRoom").lean();
  if (!group || !group.selectedRoom) {
    const error = new Error("This group does not have an active room allocation.");
    error.statusCode = 404;
    throw error;
  }

  const roomId = group.selectedRoom._id;
  const hostel = await Hostel.findById(group.selectedRoom.hostel).lean();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // 1. Cancel active allocations
      await Allocation.updateMany(
        { room: roomId, group: groupId, status: "active" },
        {
          $set: {
            status: "cancelled",
            cancelReason: `admin_release: ${reason.trim()}`,
            cancelledAt: new Date(),
          },
        },
        { session }
      );

      // 2. Reset the room
      await Room.updateOne(
        { _id: roomId },
        {
          $set: {
            currentOccupancy: 0,
            claim: { group: null, student: null, at: null },
            status: "available",
          },
        },
        { session }
      );

      // 3. Reset group status & room pointers
      const membersCount = group.members?.length || 0;
      const newStatus = membersCount >= group.targetSize ? "complete" : "forming";

      await RoommateGroup.updateOne(
        { _id: groupId },
        {
          $set: {
            selectedRoom: null,
            roomClaimedAt: null,
            status: newStatus,
          },
        },
        { session }
      );

      // 4. Reset AllocationIntents
      const memberIds = group.members.map((m) => m.user);
      await AllocationIntent.updateMany(
        { user: { $in: memberIds } },
        { $set: { allocatedAt: null } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  // Notify members
  const memberIds = (group.members || []).map((m) => m.user?.toString()).filter(Boolean);
  for (const mId of memberIds) {
    notify(mId, "room_released", {
      hostelName: hostel?.name || "Hostel",
      roomNumber: group.selectedRoom.roomNumber,
    }).catch((err) => console.error("[AdminReleaseRoom] Notification error:", err));
  }

  return { success: true, message: "Room released successfully by administrator." };
}

