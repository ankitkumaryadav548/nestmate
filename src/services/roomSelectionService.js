import mongoose from "mongoose";
import connectDB from "../lib/db.js";
import Room from "../models/Room.js";
import Hostel from "../models/Hostel.js";
import User from "../models/User.js";
import RoommateGroup from "../models/RoommateGroup.js";
import Allocation from "../models/Allocation.js";
import AllocationIntent from "../models/AllocationIntent.js";
import Preference from "../models/Preference.js";
import GroupInvitation from "../models/GroupInvitation.js";
import SelectionWindow from "../models/SelectionWindow.js";

import {
  ROOM_SOURCES,
  SELECTION_ERROR_CODES,
} from "../config/selection.js";
import { effectiveWindowStatus } from "./selection/windowStatus.js";
import { nextRoomState, canClaimRoom } from "./selection/roomState.js";
import { canStudentSelect, canReleaseRoom } from "./selection/selectionRules.js";
import { annotateRoomsForUnit } from "./selection/roomBrowser.js";
import { notify, notifyMany } from "./notificationService.js";
import { ensureOpenNotification } from "./selectionWindowService.js";

/**
 * Returns the current student's room selection context and state.
 */
export async function getSelectionState(userId) {
  await connectDB();

  // 1. Fetch live selection window
  const liveWindow = await SelectionWindow.findOne({ isActive: true });
  if (liveWindow && effectiveWindowStatus(liveWindow) === "open" && !liveWindow.openNotifiedAt) {
    await ensureOpenNotification(liveWindow);
  }
  const windowStatus = effectiveWindowStatus(liveWindow);

  // 2. Fetch student, preferences, group, and allocation
  const [student, pref, activeAllocation, activeGroup, intent] = await Promise.all([
    User.findById(userId).select("name email gender isDemo").lean(),
    Preference.findOne({ student: userId }).lean(),
    Allocation.findOne({ student: userId, status: "active" })
      .populate("room", "roomNumber floor capacity roomType")
      .populate("hostel", "name code gender")
      .lean(),
    RoommateGroup.findOne({
      "members.user": userId,
      status: { $in: ["forming", "complete", "locked"] },
    })
      .populate("selectedRoom", "roomNumber floor capacity roomType hostel")
      .populate("members.user", "name email gender")
      .lean(),
    AllocationIntent.findOne({ user: userId }).lean(),
  ]);

  const preferencesCompleted = Boolean(pref && pref.completedAt && pref.roomSize);
  const studentWithRoomSize = {
    ...student,
    id: userId.toString(),
    roomSize: pref?.roomSize || null,
  };

  let groupSummary = null;
  if (activeGroup) {
    const isLeader = String(activeGroup.leader) === String(userId);
    const membersCount = activeGroup.members?.length || 0;
    const targetSize = activeGroup.targetSize;
    const openSeats = Math.max(0, targetSize - membersCount);

    groupSummary = {
      id: activeGroup._id.toString(),
      leader: activeGroup.leader.toString(),
      isLeader,
      myRole: isLeader ? "leader" : "member",
      membersCount,
      targetSize,
      status: activeGroup.status,
      roomClaimedAt: activeGroup.roomClaimedAt || null,
      selectedRoom: activeGroup.selectedRoom
        ? {
            id: activeGroup.selectedRoom._id.toString(),
            roomNumber: activeGroup.selectedRoom.roomNumber,
            floor: activeGroup.selectedRoom.floor,
            capacity: activeGroup.selectedRoom.capacity,
            roomType: activeGroup.selectedRoom.roomType,
          }
        : null,
      openSeats,
    };
  }

  // 3. Evaluate eligibility
  const eligibility = canStudentSelect({
    student: studentWithRoomSize,
    group: groupSummary,
    hasActiveAllocation: Boolean(activeAllocation),
    preferencesCompleted,
    windowStatus,
  });

  // 4. Room summary if currently allocated
  let myRoom = null;
  if (activeAllocation && activeAllocation.room) {
    const roomDoc = activeAllocation.room;
    const hostelDoc = activeAllocation.hostel;
    const activeAllocCount = await Allocation.countDocuments({
      room: roomDoc._id,
      status: "active",
    });
    const openSeats = Math.max(0, (roomDoc.capacity || 0) - activeAllocCount);

    myRoom = {
      allocationId: activeAllocation._id.toString(),
      source: activeAllocation.source || ROOM_SOURCES.SELECTION,
      hostel: hostelDoc
        ? {
            id: hostelDoc._id.toString(),
            name: hostelDoc.name,
            code: hostelDoc.code,
          }
        : null,
      room: {
        id: roomDoc._id.toString(),
        roomNumber: roomDoc.roomNumber,
        floor: roomDoc.floor,
        capacity: roomDoc.capacity,
        roomType: roomDoc.roomType,
      },
      openSeats,
      allocatedAt: activeAllocation.allocatedAt,
    };
  }

  const releaseEligibility = canReleaseRoom({
    windowStatus,
    isLeader: groupSummary ? groupSummary.isLeader : false,
    group: groupSummary,
    isSingle: studentWithRoomSize?.roomSize === 1,
  });

  return {
    window: liveWindow
      ? {
          id: liveWindow._id.toString(),
          name: liveWindow.name,
          status: windowStatus,
          startsAt: liveWindow.startsAt,
          endsAt: liveWindow.endsAt,
          closedAt: liveWindow.closedAt,
          finalizedAt: liveWindow.finalizedAt,
        }
      : null,
    mode: eligibility.mode,
    canSelect: eligibility.allowed,
    code: eligibility.code || null,
    message: eligibility.message || null,
    eligibility: {
      canSelect: eligibility.allowed,
      code: eligibility.code || null,
      reason: eligibility.message || null,
    },
    releaseEligibility,
    group: groupSummary,
    myRoom,
    currentClaim: groupSummary?.selectedRoom
      ? {
          room: groupSummary.selectedRoom,
          hostel: groupSummary.selectedRoom.hostel,
          openSeats: groupSummary.openSeats,
        }
      : myRoom,
  };
}

/**
 * Lists free selectable rooms for the current student/group.
 * Requires an OPEN window and student eligibility.
 * STRICT PRIVACY: Returns room metadata only, never occupants or private data.
 */
export async function listSelectableRooms(userId, filters = {}) {
  await connectDB();

  // 1. Verify eligibility
  const state = await getSelectionState(userId);
  if (!state.canSelect) {
    const error = new Error(state.message || "You cannot select a room at this time.");
    error.statusCode = 409;
    error.code = state.code || SELECTION_ERROR_CODES.NOT_ELIGIBLE.code;
    throw error;
  }

  const { hostelId, floor, roomType, page = 1, limit = 20 } = filters;
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  // 2. Build unit representation
  let unit = null;
  if (state.mode === "single") {
    const [userDoc, prefDoc, intentDoc] = await Promise.all([
      User.findById(userId).select("gender year").lean(),
      Preference.findOne({ student: userId }).lean(),
      AllocationIntent.findOne({ user: userId }).lean(),
    ]);

    unit = {
      size: 1,
      members: [
        {
          id: userId.toString(),
          gender: userDoc.gender,
          year: userDoc.year,
          preferences: prefDoc || {},
        },
      ],
      roomPreferences: intentDoc?.roomPreferences || {
        preferredHostels: [],
        acType: prefDoc?.acPreference || "no-preference",
        floorPreference: "any",
      },
    };
  } else {
    // Shared group
    const groupDoc = await RoommateGroup.findById(state.group.id)
      .populate("members.user", "gender year")
      .lean();

    const memberIds = groupDoc.members.map((m) => m.user._id);
    const memberPrefs = await Preference.find({ student: { $in: memberIds } }).lean();
    const prefMap = new Map(memberPrefs.map((p) => [p.student.toString(), p]));

    const unitMembers = groupDoc.members.map((m) => ({
      id: m.user._id.toString(),
      gender: m.user.gender,
      year: m.user.year,
      preferences: prefMap.get(m.user._id.toString()) || {},
    }));

    unit = {
      size: groupDoc.targetSize,
      members: unitMembers,
      roomPreferences: groupDoc.roomPreferences || {
        preferredHostels: [],
        acType: "no-preference",
        floorPreference: "any",
      },
    };
  }

  // 3. Query candidate rooms (status "available", occupancy 0, no claim, matching capacity)
  const roomQuery = {
    status: "available",
    "claim.group": null,
    "claim.student": null,
    currentOccupancy: 0,
    capacity: unit.size,
  };

  if (hostelId) {
    roomQuery.hostel = new mongoose.Types.ObjectId(hostelId);
  }
  if (floor !== undefined && floor !== null && floor !== "") {
    roomQuery.floor = Number(floor);
  }
  if (roomType) {
    roomQuery.roomType = roomType;
  }

  // Fetch rooms and all active hostels
  const [candidateRooms, activeHostels, totalAvailable, totalClaimed] = await Promise.all([
    Room.find(roomQuery).lean(),
    Hostel.find({ isActive: true }).lean(),
    Room.countDocuments({ status: "available", capacity: unit.size }),
    Room.countDocuments({ status: "claimed", capacity: unit.size }),
  ]);

  // 4. Annotate and sort rooms using pure helper
  const annotatedRooms = annotateRoomsForUnit(candidateRooms, activeHostels, unit);

  // Calculate per-hostel free room counts
  const hostelCounts = {};
  for (const r of annotatedRooms) {
    const hId = r.hostel.id;
    if (!hostelCounts[hId]) {
      hostelCounts[hId] = {
        hostelId: hId,
        hostelCode: r.hostel.code,
        hostelName: r.hostel.name,
        availableCount: 0,
      };
    }
    hostelCounts[hId].availableCount += 1;
  }

  // Calculate eligible hostels for filtering
  const unitGender = unit?.members?.[0]?.gender;
  const eligibleHostelMap = new Map();
  for (const h of activeHostels) {
    const matchesGender = !unitGender || h.gender === unitGender || h.gender === "mixed";
    if (matchesGender) {
      const hId = h._id.toString();
      eligibleHostelMap.set(hId, {
        id: hId,
        _id: hId,
        name: h.name,
        code: h.code,
        gender: h.gender,
        totalFloors: h.totalFloors,
      });
    }
  }

  // Paginate annotated rooms
  const total = annotatedRooms.length;
  const totalPages = Math.ceil(total / parsedLimit) || 1;
  const paginated = annotatedRooms.slice((parsedPage - 1) * parsedLimit, parsedPage * parsedLimit);

  return {
    rooms: paginated,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages,
    hostelCounts: Object.values(hostelCounts),
    hostels: Array.from(eligibleHostelMap.values()),
    totalAvailable,
    totalClaimed,
  };
}

/**
 * Claims a specific room for the current student/group.
 * ATOMIC & RACE SAFE: Executed inside a MongoDB session transaction with strict conditional updates.
 */
export async function selectRoom(userId, roomId) {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    const error = new Error("Invalid room ID format");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  let resultSummary = null;
  let notificationsToSend = [];

  try {
    await session.withTransaction(async () => {
      // 1. Re-check selection window status inside transaction
      const liveWindow = await SelectionWindow.findOne({ isActive: true }).session(session).lean();
      const windowStatus = effectiveWindowStatus(liveWindow);
      if (windowStatus !== "open") {
        const error = new Error(SELECTION_ERROR_CODES.WINDOW_NOT_OPEN.message);
        error.statusCode = 409;
        error.code = SELECTION_ERROR_CODES.WINDOW_NOT_OPEN.code;
        throw error;
      }

      // 2. Fetch fresh student, preferences, and active allocations
      const [student, pref, existingAlloc] = await Promise.all([
        User.findById(userId).session(session).lean(),
        Preference.findOne({ student: userId }).session(session).lean(),
        Allocation.findOne({ student: userId, status: "active" }).session(session).lean(),
      ]);

      if (existingAlloc) {
        const error = new Error(SELECTION_ERROR_CODES.ALREADY_HAS_ROOM.message);
        error.statusCode = 409;
        error.code = SELECTION_ERROR_CODES.ALREADY_HAS_ROOM.code;
        throw error;
      }

      if (!pref || !pref.completedAt || !pref.roomSize) {
        const error = new Error(SELECTION_ERROR_CODES.PREFERENCES_INCOMPLETE.message);
        error.statusCode = 409;
        error.code = SELECTION_ERROR_CODES.PREFERENCES_INCOMPLETE.code;
        throw error;
      }

      const roomSize = Number(pref.roomSize);

      // 3. Resolve unit members
      let unitMembers = [];
      let groupId = null;

      if (roomSize === 1) {
        unitMembers = [
          {
            id: student._id.toString(),
            gender: student.gender,
            year: student.year,
            preferences: pref,
            isDemo: Boolean(student.isDemo),
          },
        ];
      } else {
        // Shared group: student must be leader of active forming/complete group
        const group = await RoommateGroup.findOne({
          "members.user": userId,
          status: { $in: ["forming", "complete"] },
        })
          .session(session)
          .lean();

        if (!group) {
          const error = new Error(SELECTION_ERROR_CODES.GROUP_REQUIRED.message);
          error.statusCode = 409;
          error.code = SELECTION_ERROR_CODES.GROUP_REQUIRED.code;
          throw error;
        }

        if (String(group.leader) !== String(userId)) {
          const error = new Error(SELECTION_ERROR_CODES.NOT_LEADER.message);
          error.statusCode = 409;
          error.code = SELECTION_ERROR_CODES.NOT_LEADER.code;
          throw error;
        }

        if (group.selectedRoom) {
          const error = new Error(SELECTION_ERROR_CODES.ALREADY_HAS_ROOM.message);
          error.statusCode = 409;
          error.code = SELECTION_ERROR_CODES.ALREADY_HAS_ROOM.code;
          throw error;
        }

        if (group.targetSize !== roomSize) {
          const error = new Error(SELECTION_ERROR_CODES.NOT_ELIGIBLE.message);
          error.statusCode = 409;
          error.code = SELECTION_ERROR_CODES.NOT_ELIGIBLE.code;
          throw error;
        }

        groupId = group._id;
        const memberIds = group.members.map((m) => m.user);
        const [membersUsers, membersPrefs] = await Promise.all([
          User.find({ _id: { $in: memberIds } }).session(session).lean(),
          Preference.find({ student: { $in: memberIds } }).session(session).lean(),
        ]);

        const prefMap = new Map(membersPrefs.map((p) => [p.student.toString(), p]));
        unitMembers = membersUsers.map((u) => ({
          id: u._id.toString(),
          gender: u.gender,
          year: u.year,
          preferences: prefMap.get(u._id.toString()) || {},
          isDemo: Boolean(u.isDemo),
        }));
      }

      // 4. Load target room and hostel
      const room = await Room.findById(roomId).session(session).lean();
      if (!room) {
        const error = new Error("Room not found");
        error.statusCode = 404;
        throw error;
      }

      const hostel = await Hostel.findById(room.hostel).session(session).lean();
      if (!hostel) {
        const error = new Error("Hostel not found");
        error.statusCode = 404;
        throw error;
      }

      // 5. Pre-check validity with pure helper
      const claimCheck = canClaimRoom(room, hostel, {
        size: roomSize,
        members: unitMembers,
      });

      if (!claimCheck.ok) {
        const error = new Error(claimCheck.reason || SELECTION_ERROR_CODES.ROOM_NOT_VALID.message);
        error.statusCode = 409;
        error.code = claimCheck.code || SELECTION_ERROR_CODES.ROOM_NOT_VALID.code;
        throw error;
      }

      // 6. CONDITIONAL UPDATE ON ROOM: Atomic claim
      const initialOccupancy = unitMembers.length;
      const targetStatus = nextRoomState({
        capacity: roomSize,
        occupancy: initialOccupancy,
        hasClaim: true,
      });

      const claimData = {
        group: groupId || null,
        student: roomSize === 1 ? student._id : null,
        at: new Date(),
      };

      const roomClaimResult = await Room.updateOne(
        {
          _id: roomId,
          status: "available",
          "claim.group": null,
          "claim.student": null,
          currentOccupancy: 0,
          capacity: roomSize,
        },
        {
          $set: {
            claim: claimData,
            currentOccupancy: initialOccupancy,
            status: targetStatus,
          },
        },
        { session }
      );

      if (roomClaimResult.matchedCount !== 1) {
        const error = new Error(SELECTION_ERROR_CODES.ROOM_TAKEN.message);
        error.statusCode = 409;
        error.code = SELECTION_ERROR_CODES.ROOM_TAKEN.code;
        throw error;
      }

      // 7. If shared group, CONDITIONAL UPDATE ON GROUP: Set selectedRoom
      if (groupId) {
        const groupUpdateResult = await RoommateGroup.updateOne(
          {
            _id: groupId,
            selectedRoom: null,
            status: { $in: ["forming", "complete"] },
          },
          {
            $set: {
              selectedRoom: roomId,
              roomClaimedAt: new Date(),
            },
          },
          { session }
        );

        if (groupUpdateResult.matchedCount !== 1) {
          const error = new Error("Failed to assign room to group. Room selection aborted.");
          error.statusCode = 409;
          error.code = SELECTION_ERROR_CODES.ALREADY_HAS_ROOM.code;
          throw error;
        }

        // If the group is already full, cancel remaining pending invitations
        if (unitMembers.length >= roomSize) {
          await GroupInvitation.updateMany(
            { group: groupId, status: "pending" },
            { $set: { status: "cancelled", respondedAt: new Date() } },
            { session }
          );
        }
      }

      // 8. Create one Allocation record per current member
      const allocationsToInsert = unitMembers.map((m) => ({
        student: m.id,
        room: roomId,
        hostel: hostel._id,
        group: groupId || null,
        run: null,
        source: ROOM_SOURCES.SELECTION,
        status: "active",
        bedNumber: room.capacity === 1 ? 1 : null,
        allocatedAt: new Date(),
        isDemo: m.isDemo,
      }));

      await Allocation.insertMany(allocationsToInsert, { session });

      // 9. Update AllocationIntent.allocatedAt for all members
      const memberUserIds = unitMembers.map((m) => m.id);
      await AllocationIntent.updateMany(
        { user: { $in: memberUserIds } },
        { $set: { allocatedAt: new Date() } },
        { session }
      );

      // Prepare notifications to send after commit
      notificationsToSend = memberUserIds.map((uId) => ({
        userId: uId,
        type: "room_selected",
        params: {
          hostelName: hostel.name,
          roomNumber: room.roomNumber,
        },
      }));

      resultSummary = {
        success: true,
        room: {
          id: room._id.toString(),
          roomNumber: room.roomNumber,
          floor: room.floor,
          capacity: room.capacity,
          roomType: room.roomType,
        },
        hostel: {
          id: hostel._id.toString(),
          name: hostel.name,
          code: hostel.code,
        },
        openSeats: Math.max(0, roomSize - initialOccupancy),
      };
    });
  } finally {
    await session.endSession();
  }

  // Best-effort post-commit notifications
  for (const n of notificationsToSend) {
    notify(n.userId, n.type, n.params).catch((err) =>
      console.error("[RoomSelectionService] Failed to notify member on select:", err)
    );
  }

  return resultSummary;
}

/**
 * Releases a previously claimed room.
 * Leader or 1-seater student only; strictly allowed ONLY while the window is OPEN.
 */
export async function releaseRoom(userId) {
  await connectDB();

  const session = await mongoose.startSession();
  let notificationsToSend = [];

  try {
    await session.withTransaction(async () => {
      // 1. Check window status
      const liveWindow = await SelectionWindow.findOne({ isActive: true }).session(session).lean();
      const windowStatus = effectiveWindowStatus(liveWindow);
      if (windowStatus !== "open") {
        const error = new Error(SELECTION_ERROR_CODES.WINDOW_CLOSED_RELEASE_BLOCKED.message);
        error.statusCode = 409;
        error.code = SELECTION_ERROR_CODES.WINDOW_CLOSED_RELEASE_BLOCKED.code;
        throw error;
      }

      // 2. Fetch student's active allocation
      const activeAlloc = await Allocation.findOne({ student: userId, status: "active" })
        .session(session)
        .populate("room")
        .populate("hostel")
        .lean();

      if (!activeAlloc) {
        const error = new Error("You do not have an active room allocation to release.");
        error.statusCode = 404;
        throw error;
      }

      const roomId = activeAlloc.room?._id || activeAlloc.room;
      const isSingle = !activeAlloc.group;

      let memberIdsToNotify = [];
      const hostelName = activeAlloc.hostel?.name || "Hostel";
      const roomNumber = activeAlloc.room?.roomNumber || "Room";

      if (isSingle) {
        // Release single room
        await Allocation.updateMany(
          { room: roomId, status: "active" },
          { $set: { status: "cancelled", cancelReason: "released", cancelledAt: new Date() } },
          { session }
        );

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

        await AllocationIntent.updateOne(
          { user: userId },
          { $set: { allocatedAt: null } },
          { session }
        );
      } else {
        // Group room
        const groupId = activeAlloc.group;
        const group = await RoommateGroup.findById(groupId).session(session).lean();

        if (!group) {
          const error = new Error("Associated roommate group not found");
          error.statusCode = 404;
          throw error;
        }

        const isLeader = String(group.leader) === String(userId);
        const releaseCheck = canReleaseRoom({
          windowStatus,
          isLeader,
          group,
        });

        if (!releaseCheck.allowed) {
          const error = new Error(releaseCheck.reason || SELECTION_ERROR_CODES.NOT_LEADER.message);
          error.statusCode = 409;
          error.code = releaseCheck.code || SELECTION_ERROR_CODES.NOT_LEADER.code;
          throw error;
        }

        // Cancel all active allocations for this group's room
        await Allocation.updateMany(
          { room: roomId, group: groupId, status: "active" },
          { $set: { status: "cancelled", cancelReason: "released", cancelledAt: new Date() } },
          { session }
        );

        // Reset the room
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

        // Reset group: clear selectedRoom and set status based on member count
        const membersCount = group.members?.length || 0;
        const newGroupStatus = membersCount >= group.targetSize ? "complete" : "forming";

        await RoommateGroup.updateOne(
          { _id: groupId },
          {
            $set: {
              selectedRoom: null,
              roomClaimedAt: null,
              status: newGroupStatus,
            },
          },
          { session }
        );

        // Clear allocatedAt on intents
        const memberIds = group.members.map((m) => m.user);
        await AllocationIntent.updateMany(
          { user: { $in: memberIds } },
          { $set: { allocatedAt: null } },
          { session }
        );

        // Notify other members
        memberIdsToNotify = memberIds
          .map((id) => id.toString())
          .filter((id) => id !== userId.toString());
      }

      notificationsToSend = memberIdsToNotify.map((uId) => ({
        userId: uId,
        type: "room_released",
        params: { hostelName, roomNumber },
      }));
    });
  } finally {
    await session.endSession();
  }

  // Send notifications post-commit
  for (const n of notificationsToSend) {
    notify(n.userId, n.type, n.params).catch((err) =>
      console.error("[RoomSelectionService] Failed to notify on room release:", err)
    );
  }

  return { success: true, message: "Room released successfully" };
}

/**
 * Helper to add a student to an already roomed group and claim an open bed.
 * Used by acceptInvitation and by selection auto-fill.
 * MUST be executed inside caller's MongoDB session.
 */
export async function joinRoomedGroup(groupId, studentId, options = {}) {
  const { session, source = ROOM_SOURCES.SELECTION } = options;
  if (!session) {
    throw new Error("joinRoomedGroup requires an active MongoDB session");
  }

  const group = await RoommateGroup.findById(groupId).session(session).lean();
  if (!group || !group.selectedRoom) {
    throw new Error("Group does not have an active selected room");
  }

  const roomId = group.selectedRoom;
  const room = await Room.findById(roomId).session(session).lean();
  if (!room) {
    throw new Error("Group's selected room was not found");
  }

  // 1. CONDITIONAL UPDATE ON ROOM: Increment occupancy and update status
  const updatedRoom = await Room.findOneAndUpdate(
    {
      _id: roomId,
      "claim.group": groupId,
      $expr: { $lt: ["$currentOccupancy", "$capacity"] },
    },
    {
      $inc: { currentOccupancy: 1 },
    },
    { session, new: true }
  );

  if (!updatedRoom) {
    const error = new Error("No open seat remains in this room");
    error.statusCode = 409;
    error.code = "SEAT_UNAVAILABLE";
    throw error;
  }

  // Update room status if full
  const newStatus = updatedRoom.currentOccupancy >= updatedRoom.capacity ? "full" : "claimed";
  if (updatedRoom.status !== newStatus) {
    await Room.updateOne({ _id: roomId }, { $set: { status: newStatus } }, { session });
  }

  // 2. Create student's Allocation
  const student = await User.findById(studentId).session(session).lean();
  const allocation = new Allocation({
    student: studentId,
    room: roomId,
    hostel: room.hostel,
    group: groupId,
    run: null,
    source,
    status: "active",
    bedNumber: room.capacity === 1 ? 1 : null,
    allocatedAt: new Date(),
    isDemo: Boolean(student?.isDemo),
  });
  await allocation.save({ session });

  // 3. Mark AllocationIntent
  await AllocationIntent.updateOne(
    { user: studentId },
    { $set: { allocatedAt: new Date() } },
    { session }
  );

  return { success: true, room: updatedRoom };
}

/**
 * Helper to remove a student from a roomed group and release their seat.
 * Used by leaveGroup, removeMember, and adminRemoveMember.
 * MUST be executed inside caller's MongoDB session.
 */
export async function leaveRoomedGroup(groupId, studentId, options = {}) {
  const { session, reason = "left_group" } = options;
  if (!session) {
    throw new Error("leaveRoomedGroup requires an active MongoDB session");
  }

  const group = await RoommateGroup.findById(groupId).session(session).lean();
  if (!group || !group.selectedRoom) return;

  const roomId = group.selectedRoom;

  // 1. Cancel student's allocation
  await Allocation.updateOne(
    { student: studentId, room: roomId, status: "active" },
    { $set: { status: "cancelled", cancelReason: reason, cancelledAt: new Date() } },
    { session }
  );

  // 2. Decrement room occupancy and adjust status back to "claimed"
  await Room.updateOne(
    { _id: roomId, "claim.group": groupId },
    {
      $inc: { currentOccupancy: -1 },
      $set: { status: "claimed" },
    },
    { session }
  );

  // 3. Clear intent allocatedAt
  await AllocationIntent.updateOne(
    { user: studentId },
    { $set: { allocatedAt: null } },
    { session }
  );
}

/**
 * Helper to completely release a room when its claiming group is disbanded.
 * Used by disbandGroup and adminDisbandGroup.
 * MUST be executed inside caller's MongoDB session.
 */
export async function releaseRoomForDisbandedGroup(groupId, optionsOrSession) {
  const session = optionsOrSession?.session || optionsOrSession;
  if (!session) {
    throw new Error("releaseRoomForDisbandedGroup requires an active MongoDB session");
  }

  const group = await RoommateGroup.findById(groupId).session(session).lean();
  if (!group || !group.selectedRoom) return;

  const roomId = group.selectedRoom;

  // Cancel all active allocations
  await Allocation.updateMany(
    { room: roomId, group: groupId, status: "active" },
    { $set: { status: "cancelled", cancelReason: "group_disbanded", cancelledAt: new Date() } },
    { session }
  );

  // Reset room to available
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

  // Clear allocatedAt on intents of all members
  const memberIds = (group.members || []).map((m) => m.user);
  await AllocationIntent.updateMany(
    { user: { $in: memberIds } },
    { $set: { allocatedAt: null } },
    { session }
  );
}

