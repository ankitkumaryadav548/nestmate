/**
 * Bed Assignment and Roommates Service
 *
 * Provides safe, authenticated roommate views and transactional bed assignment
 * operations for group leaders and students with active room allocations.
 *
 * STRICT PRIVACY RULES:
 * - Phone number is only revealed if the roommate has opted into sharing it (sharePhoneWithRoommates).
 * - NEVER leaks email, registration number, or lifestyle survey responses.
 */

import mongoose from "mongoose";
import connectDB from "../lib/db.js";
import Allocation from "../models/Allocation.js";
import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import RoommateGroup from "../models/RoommateGroup.js";
import { validateBedAssignments, autoAssignRemaining } from "./beds/bedRules.js";
import { notify } from "./notificationService.js";

/**
 * Retrieves the authenticated student's active room, bed allocations, and roommates.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getRoommatesAndBeds(userId) {
  await connectDB();

  const myAlloc = await Allocation.findOne({
    student: userId,
    status: "active",
  })
    .populate("room")
    .populate("hostel")
    .lean();

  if (!myAlloc || !myAlloc.room || !myAlloc.hostel) {
    const error = new Error("You do not have an active room allocation yet.");
    error.statusCode = 404;
    error.code = "NO_ACTIVE_ALLOCATION";
    throw error;
  }

  const roomId = myAlloc.room._id;
  const capacity = myAlloc.room.capacity || 1;

  // Find all co-occupants with active allocations in this room
  const roomAllocations = await Allocation.find({
    room: roomId,
    status: "active",
  }).lean();

  const studentIds = roomAllocations.map((a) => a.student);

  // Parallel fetch of users, profiles, and group
  const [users, profiles, groupDoc] = await Promise.all([
    User.find({ _id: { $in: studentIds } })
      .select("name course department year phone")
      .lean(),
    StudentProfile.find({ user: { $in: studentIds } })
      .select("user sharePhoneWithRoommates")
      .lean(),
    myAlloc.group
      ? RoommateGroup.findById(myAlloc.group).select("leader").lean()
      : null,
  ]);

  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(String(p.user), p));

  const userMap = new Map();
  users.forEach((u) => userMap.set(String(u._id), u));

  // Determine group leadership
  const leaderId = groupDoc ? String(groupDoc.leader) : String(userId);
  const isLeader = groupDoc ? String(groupDoc.leader) === String(userId) : true;

  function formatSafeMember(uDoc, isMe) {
    const uId = String(uDoc._id);
    const profile = profileMap.get(uId);

    let phone = null;
    let phoneStatus = "hidden_by_student";

    if (!uDoc.phone || uDoc.phone.trim() === "") {
      phoneStatus = "not_provided";
    } else if (isMe) {
      phone = uDoc.phone.trim();
      phoneStatus = "shared";
    } else if (profile && profile.sharePhoneWithRoommates === false) {
      phoneStatus = "hidden_by_student";
    } else {
      phone = uDoc.phone.trim();
      phoneStatus = "shared";
    }

    return {
      id: uId,
      name: uDoc.name,
      course: uDoc.course || "Not specified",
      department: uDoc.department || "",
      year: uDoc.year || null,
      isLeader: uId === leaderId,
      isMe,
      phone,
      phoneStatus,
    };
  }

  // Map each active allocation to its safe member representation
  const bedToMember = new Map();
  const unassignedMembers = [];

  for (const a of roomAllocations) {
    const uDoc = userMap.get(String(a.student));
    if (!uDoc) continue;

    const isMe = String(a.student) === String(userId);
    const memberObj = formatSafeMember(uDoc, isMe);

    if (
      typeof a.bedNumber === "number" &&
      a.bedNumber >= 1 &&
      a.bedNumber <= capacity
    ) {
      bedToMember.set(a.bedNumber, memberObj);
    } else {
      unassignedMembers.push(memberObj);
    }
  }

  // Construct complete 1..capacity beds array
  const beds = [];
  for (let b = 1; b <= capacity; b++) {
    beds.push({
      bedNumber: b,
      member: bedToMember.get(b) || null,
    });
  }

  const openSeats = Math.max(0, capacity - roomAllocations.length);

  return {
    hostel: {
      name: myAlloc.hostel.name,
      code: myAlloc.hostel.code,
    },
    room: {
      id: String(myAlloc.room._id),
      roomNumber: myAlloc.room.roomNumber,
      floor: myAlloc.room.floor,
      roomType: myAlloc.room.roomType,
      capacity,
    },
    isLeader,
    beds,
    unassignedMembers,
    openSeats,
  };
}

/**
 * Assigns bed numbers to room members.
 * LEADER ONLY. Runs inside an atomic MongoDB session transaction.
 *
 * @param {string} userId - Requesting user ID (must be group leader or single student)
 * @param {Array<{ userId: string, bedNumber: number | null }>} assignments
 * @returns {Promise<object>}
 */
export async function assignBeds(userId, assignments) {
  await connectDB();

  const myAlloc = await Allocation.findOne({
    student: userId,
    status: "active",
  })
    .populate("room")
    .populate("hostel")
    .lean();

  if (!myAlloc || !myAlloc.room || !myAlloc.hostel) {
    const error = new Error("You do not have an active room allocation.");
    error.statusCode = 404;
    error.code = "NO_ACTIVE_ALLOCATION";
    throw error;
  }

  // Check leader authorization
  if (myAlloc.group) {
    const group = await RoommateGroup.findById(myAlloc.group).select("leader").lean();
    if (!group || String(group.leader) !== String(userId)) {
      const error = new Error("Only the group leader can assign beds in this room.");
      error.statusCode = 403;
      error.code = "FORBIDDEN_NOT_LEADER";
      throw error;
    }
  }

  const roomId = myAlloc.room._id;
  const capacity = myAlloc.room.capacity || 1;

  const session = await mongoose.startSession();
  const changedNotifications = [];

  try {
    await session.withTransaction(async () => {
      // 1. Fresh fetch of all active allocations in this room
      const roomAllocations = await Allocation.find({
        room: roomId,
        status: "active",
      }).session(session);

      const activeMemberIds = roomAllocations.map((a) => String(a.student));
      const currentMap = {};
      const allocByStudent = new Map();

      for (const a of roomAllocations) {
        currentMap[String(a.student)] = typeof a.bedNumber === "number" ? a.bedNumber : null;
        allocByStudent.set(String(a.student), a);
      }

      // 2. Validate assignments proposal
      const validation = validateBedAssignments({
        capacity,
        members: activeMemberIds,
        assignments,
        currentMap,
      });

      if (!validation.ok) {
        const error = new Error(validation.error);
        error.statusCode = 400;
        throw error;
      }

      const finalMap = validation.finalMap;

      // 3. Find modified allocations
      const toUpdate = [];
      for (const [sId, newBed] of Object.entries(finalMap)) {
        const oldBed = currentMap[sId];
        if (oldBed !== newBed) {
          toUpdate.push({
            sId,
            oldBed,
            newBed,
            alloc: allocByStudent.get(sId),
          });
        }
      }

      if (toUpdate.length === 0) {
        return; // Nothing changed
      }

      // 4. Clear beds first to avoid collision on partial unique index during swaps
      const updateAllocIds = toUpdate.map((u) => u.alloc._id);
      await Allocation.updateMany(
        { _id: { $in: updateAllocIds } },
        { $set: { bedNumber: null } },
        { session }
      );

      // 5. Apply new bed numbers
      for (const u of toUpdate) {
        if (u.newBed !== null) {
          await Allocation.updateOne(
            { _id: u.alloc._id },
            { $set: { bedNumber: u.newBed } },
            { session }
          );
        }
      }

      // 6. Queue notifications for students whose bed changed
      for (const u of toUpdate) {
        if (u.newBed !== null && u.newBed !== u.oldBed) {
          changedNotifications.push({
            studentId: u.sId,
            allocationId: String(u.alloc._id),
            bedNumber: u.newBed,
            roomNumber: myAlloc.room.roomNumber,
            hostelName: myAlloc.hostel.name,
          });
        }
      }
    });
  } catch (err) {
    if (err.code === 11000 || (err.message && err.message.includes("E11000"))) {
      const conflictError = new Error("Bed assignment conflict: another roommate was assigned this bed concurrently.");
      conflictError.statusCode = 409;
      throw conflictError;
    }
    throw err;
  } finally {
    await session.endSession();
  }

  // Best-effort notification delivery after transaction commit
  for (const item of changedNotifications) {
    try {
      await notify(
        item.studentId,
        "bed_assigned",
        {
          bedNumber: item.bedNumber,
          roomNumber: item.roomNumber,
          hostelName: item.hostelName,
        },
        {
          dedupeKey: `bed_${item.allocationId}_${item.bedNumber}`,
          link: "/dashboard/roommates",
        }
      );
    } catch (notifErr) {
      console.warn("[Bed Notification Error]:", notifErr.message);
    }
  }

  return { success: true, message: "Bed assignments saved successfully." };
}

/**
 * Automatically assigns the lowest free bed to each unassigned member.
 * LEADER ONLY. Runs inside an atomic MongoDB session transaction.
 *
 * @param {string} userId - Requesting user ID
 * @returns {Promise<object>}
 */
export async function autoAssignBeds(userId) {
  await connectDB();

  const myAlloc = await Allocation.findOne({
    student: userId,
    status: "active",
  })
    .populate("room")
    .populate("hostel")
    .lean();

  if (!myAlloc || !myAlloc.room || !myAlloc.hostel) {
    const error = new Error("You do not have an active room allocation.");
    error.statusCode = 404;
    error.code = "NO_ACTIVE_ALLOCATION";
    throw error;
  }

  // Check leader authorization
  if (myAlloc.group) {
    const group = await RoommateGroup.findById(myAlloc.group).select("leader").lean();
    if (!group || String(group.leader) !== String(userId)) {
      const error = new Error("Only the group leader can assign beds in this room.");
      error.statusCode = 403;
      error.code = "FORBIDDEN_NOT_LEADER";
      throw error;
    }
  }

  const roomId = myAlloc.room._id;
  const capacity = myAlloc.room.capacity || 1;

  const session = await mongoose.startSession();
  const changedNotifications = [];

  try {
    await session.withTransaction(async () => {
      const roomAllocations = await Allocation.find({
        room: roomId,
        status: "active",
      }).session(session);

      const activeMemberIds = roomAllocations.map((a) => String(a.student));
      const currentMap = {};
      const allocByStudent = new Map();

      for (const a of roomAllocations) {
        currentMap[String(a.student)] = typeof a.bedNumber === "number" ? a.bedNumber : null;
        allocByStudent.set(String(a.student), a);
      }

      // Deterministic auto-assignment
      const finalMap = autoAssignRemaining(capacity, currentMap, activeMemberIds);

      // Find changed members
      const toUpdate = [];
      for (const [sId, newBed] of Object.entries(finalMap)) {
        const oldBed = currentMap[sId];
        if (oldBed !== newBed) {
          toUpdate.push({
            sId,
            oldBed,
            newBed,
            alloc: allocByStudent.get(sId),
          });
        }
      }

      if (toUpdate.length === 0) {
        return;
      }

      // Clear affected beds first
      const updateAllocIds = toUpdate.map((u) => u.alloc._id);
      await Allocation.updateMany(
        { _id: { $in: updateAllocIds } },
        { $set: { bedNumber: null } },
        { session }
      );

      // Set new beds
      for (const u of toUpdate) {
        if (u.newBed !== null) {
          await Allocation.updateOne(
            { _id: u.alloc._id },
            { $set: { bedNumber: u.newBed } },
            { session }
          );
        }
      }

      for (const u of toUpdate) {
        if (u.newBed !== null && u.newBed !== u.oldBed) {
          changedNotifications.push({
            studentId: u.sId,
            allocationId: String(u.alloc._id),
            bedNumber: u.newBed,
            roomNumber: myAlloc.room.roomNumber,
            hostelName: myAlloc.hostel.name,
          });
        }
      }
    });
  } catch (err) {
    if (err.code === 11000 || (err.message && err.message.includes("E11000"))) {
      const conflictError = new Error("Bed assignment conflict: another roommate was assigned this bed concurrently.");
      conflictError.statusCode = 409;
      throw conflictError;
    }
    throw err;
  } finally {
    await session.endSession();
  }

  // Best-effort notification delivery after commit
  for (const item of changedNotifications) {
    try {
      await notify(
        item.studentId,
        "bed_assigned",
        {
          bedNumber: item.bedNumber,
          roomNumber: item.roomNumber,
          hostelName: item.hostelName,
        },
        {
          dedupeKey: `bed_${item.allocationId}_${item.bedNumber}`,
          link: "/dashboard/roommates",
        }
      );
    } catch (notifErr) {
      console.warn("[Bed Notification Error]:", notifErr.message);
    }
  }

  return { success: true, message: "Unassigned beds automatically assigned." };
}

