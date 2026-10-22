import mongoose from "mongoose";
import Room, { computeRoomStatus } from "@/models/Room";
import Hostel from "@/models/Hostel";
import { buildHostelEligibilityQuery } from "./hostelService";

/**
 * Retrieves rooms based on filters with role-based field projections and eligibility checks.
 */
export async function getRooms(user, options = {}) {
  const {
    hostelId,
    floor,
    roomType,
    status,
    availableOnly,
    page = 1,
    limit = 50,
    sortBy = "roomNumber",
    sortOrder = "asc",
  } = options;

  const filters = {};

  // Floor filter
  if (floor !== undefined && floor !== "") {
    filters.floor = parseInt(floor, 10);
  }

  // Room type filter
  if (roomType) {
    filters.roomType = roomType;
  }

  // Status filter
  if (status) {
    filters.status = status;
  }

  // Available only filter: rooms where occupancy < capacity and not maintenance
  if (availableOnly === true || availableOnly === "true") {
    filters.status = "available";
    filters.$expr = { $lt: ["$currentOccupancy", "$capacity"] };
  }

  // Hostel filter & eligibility restriction
  if (user && user.role === "student") {
    // Determine eligible hostels for this student
    const eligibleHostelQuery = buildHostelEligibilityQuery(user);
    const eligibleHostels = await Hostel.find(eligibleHostelQuery).select("_id");
    const eligibleHostelIds = eligibleHostels.map((h) => h._id);

    if (hostelId) {
      if (!mongoose.Types.ObjectId.isValid(hostelId)) {
        return { rooms: [], pagination: { total: 0, page: 1, limit, totalPages: 1 } };
      }
      const isEligible = eligibleHostelIds.some((id) => id.toString() === hostelId);
      if (!isEligible) {
        return { rooms: [], pagination: { total: 0, page: 1, limit, totalPages: 1 } };
      }
      filters.hostel = new mongoose.Types.ObjectId(hostelId);
    } else {
      filters.hostel = { $in: eligibleHostelIds };
    }
  } else if (hostelId) {
    if (!mongoose.Types.ObjectId.isValid(hostelId)) {
      return { rooms: [], pagination: { total: 0, page: 1, limit, totalPages: 1 } };
    }
    filters.hostel = new mongoose.Types.ObjectId(hostelId);
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  // Sorting
  const sortDirection = sortOrder === "desc" ? -1 : 1;
  const sortObj = {};
  sortObj[sortBy] = sortDirection;

  // Field projection: Students only see safe public fields (no admin notes)
  const projection =
    user && user.role === "student"
      ? "hostel roomNumber floor capacity currentOccupancy roomType status"
      : "hostel roomNumber floor capacity currentOccupancy roomType status notes createdAt updatedAt";

  const total = await Room.countDocuments(filters);
  const rooms = await Room.find(filters)
    .select(projection)
    .populate("hostel", "name code gender")
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Add virtual availableBeds calculation
  const enhancedRooms = rooms.map((r) => ({
    ...r,
    availableBeds: Math.max(0, r.capacity - r.currentOccupancy),
  }));

  return {
    rooms: enhancedRooms,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Creates a single room. Validates floor against hostel.totalFloors and ensures roomNumber uniqueness.
 */
export async function createRoom(roomData) {
  const { hostelId, roomNumber, floor, capacity, roomType, notes = "" } = roomData;

  const hostel = await Hostel.findById(hostelId);
  if (!hostel) {
    throw new Error("Hostel not found");
  }

  if (floor > hostel.totalFloors) {
    throw new Error(
      `Floor ${floor} exceeds hostel's maximum floor count of ${hostel.totalFloors}.`
    );
  }

  const trimmedRoomNumber = roomNumber.trim();
  const existing = await Room.findOne({
    hostel: hostelId,
    roomNumber: trimmedRoomNumber,
  });

  if (existing) {
    throw new Error(
      `Room "${trimmedRoomNumber}" already exists in hostel "${hostel.name} (${hostel.code})".`
    );
  }

  const room = new Room({
    hostel: hostelId,
    roomNumber: trimmedRoomNumber,
    floor,
    capacity,
    roomType,
    notes,
    currentOccupancy: 0,
    status: "available",
  });

  return await room.save();
}

/**
 * Creates multiple rooms in bulk for a specified hostel and floor.
 * Automatically skips duplicate room numbers and reports summary.
 */
export async function createRoomsBulk(bulkData) {
  const {
    hostelId,
    floor,
    startNumber,
    count,
    capacity,
    roomType,
    roomNumberPrefix = "",
  } = bulkData;

  const hostel = await Hostel.findById(hostelId);
  if (!hostel) {
    throw new Error("Hostel not found");
  }

  if (floor > hostel.totalFloors) {
    throw new Error(
      `Floor ${floor} exceeds hostel's maximum floor count of ${hostel.totalFloors}.`
    );
  }

  const sanitizedCount = Math.min(Math.max(1, parseInt(count, 10)), 200);
  const start = parseInt(startNumber, 10);

  // Generate candidate room numbers
  const candidateNumbers = [];
  for (let i = 0; i < sanitizedCount; i++) {
    const num = start + i;
    const roomStr = roomNumberPrefix ? `${roomNumberPrefix}${num}` : `${num}`;
    candidateNumbers.push(roomStr);
  }

  // Find existing rooms with these numbers in this hostel
  const existingRooms = await Room.find({
    hostel: hostelId,
    roomNumber: { $in: candidateNumbers },
  }).select("roomNumber");

  const existingSet = new Set(existingRooms.map((r) => r.roomNumber));

  const roomsToCreate = [];
  const skippedNumbers = [];

  for (const rNum of candidateNumbers) {
    if (existingSet.has(rNum)) {
      skippedNumbers.push(rNum);
    } else {
      roomsToCreate.push({
        hostel: hostelId,
        roomNumber: rNum,
        floor,
        capacity,
        roomType,
        currentOccupancy: 0,
        status: "available",
        notes: "",
      });
    }
  }

  let createdCount = 0;
  if (roomsToCreate.length > 0) {
    const inserted = await Room.insertMany(roomsToCreate);
    createdCount = inserted.length;
  }

  return {
    created: createdCount,
    skipped: skippedNumbers.length,
    skippedNumbers,
    totalRequested: sanitizedCount,
  };
}

/**
 * Updates a room with validation against occupancy limits and floor bounds.
 */
export async function updateRoom(id, updateData) {
  const room = await Room.findById(id).populate("hostel");
  if (!room) {
    throw new Error("Room not found");
  }

  // Do not allow capacity to be reduced below current occupancy
  if (updateData.capacity !== undefined) {
    if (updateData.capacity < room.currentOccupancy) {
      throw new Error(
        `Cannot reduce room capacity to ${updateData.capacity}. The room currently has ${room.currentOccupancy} occupant(s).`
      );
    }
    room.capacity = updateData.capacity;
  }

  // Validate floor if changed
  if (updateData.floor !== undefined) {
    if (room.hostel && updateData.floor > room.hostel.totalFloors) {
      throw new Error(
        `Floor ${updateData.floor} exceeds hostel's maximum floor count of ${room.hostel.totalFloors}.`
      );
    }
    room.floor = updateData.floor;
  }

  // Validate room number uniqueness if changed
  if (updateData.roomNumber && updateData.roomNumber.trim() !== room.roomNumber) {
    const trimmed = updateData.roomNumber.trim();
    const duplicate = await Room.findOne({
      hostel: room.hostel._id || room.hostel,
      roomNumber: trimmed,
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new Error(`Room "${trimmed}" already exists in this hostel.`);
    }
    room.roomNumber = trimmed;
  }

  if (updateData.roomType) room.roomType = updateData.roomType;
  if (updateData.notes !== undefined) room.notes = updateData.notes;
  if (updateData.status) room.status = updateData.status;

  // Auto-calculate status unless set to maintenance
  if (room.status !== "maintenance") {
    room.status = computeRoomStatus(room.capacity, room.currentOccupancy, room.status);
  }

  return await room.save();
}

/**
 * Deletes a room if currentOccupancy is 0.
 */
export async function deleteRoom(id) {
  const room = await Room.findById(id);
  if (!room) {
    throw new Error("Room not found");
  }

  if (room.currentOccupancy > 0) {
    throw new Error(
      `Cannot delete room ${room.roomNumber}: It currently has ${room.currentOccupancy} student occupant(s).`
    );
  }

  await Room.findByIdAndDelete(id);
  return { success: true, deletedRoom: room };
}
