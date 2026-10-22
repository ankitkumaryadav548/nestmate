import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { requireAuth, requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import Room from "@/models/Room";
import Hostel from "@/models/Hostel";
import { updateRoom, deleteRoom } from "@/services/roomService";
import { buildHostelEligibilityQuery } from "@/services/hostelService";
import { z } from "zod";

const updateRoomSchema = z.object({
  roomNumber: z.string().trim().min(1).optional(),
  floor: z.coerce.number().int().min(0).optional(),
  capacity: z.coerce.number().int().min(1).max(6).optional(),
  roomType: z.enum(["AC", "Non-AC"]).optional(),
  status: z.enum(["available", "full", "maintenance"]).optional(),
  notes: z.string().trim().optional(),
});

/**
 * GET /api/rooms/[id]
 * Retrieves single room details. Students only see safe fields for eligible hostels.
 */
export async function GET(request, { params }) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid room ID format", 400);
    }

    await connectDB();

    const room = await Room.findById(id).populate("hostel", "name code gender totalFloors isActive allowedYears");
    if (!room) {
      return failure("Room not found", 404);
    }

    // If student, check eligibility for the room's hostel
    if (user.role === "student") {
      const eligibilityQuery = buildHostelEligibilityQuery(user, { _id: room.hostel._id });
      const isEligible = await Hostel.exists(eligibilityQuery);
      if (!isEligible) {
        return failure("Room not found or you are not eligible to view it", 404);
      }

      // Return sanitized room object
      return success({
        _id: room._id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        capacity: room.capacity,
        currentOccupancy: room.currentOccupancy,
        availableBeds: Math.max(0, room.capacity - room.currentOccupancy),
        roomType: room.roomType,
        status: room.status,
        hostel: {
          _id: room.hostel._id,
          name: room.hostel.name,
          code: room.hostel.code,
          gender: room.hostel.gender,
        },
      });
    }

    return success({
      ...room.toObject(),
      availableBeds: Math.max(0, room.capacity - room.currentOccupancy),
    });
  } catch (error) {
    console.error("[API_ROOM_GET_ID_ERROR]:", error);
    return failure(error.message || "Failed to retrieve room", 500);
  }
}

/**
 * PUT /api/rooms/[id]
 * Admin only: updates a room.
 */
export async function PUT(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid room ID format", 400);
    }

    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch {
      return failure("Invalid JSON payload", 400);
    }

    const validation = updateRoomSchema.safeParse(body);
    if (!validation.success) {
      return failure("Validation failed", 400, validation.error.format());
    }

    const updated = await updateRoom(id, validation.data);
    return success(updated, "Room updated successfully");
  } catch (error) {
    console.error("[API_ROOM_PUT_ERROR]:", error);
    return failure(error.message || "Failed to update room", 400);
  }
}

/**
 * DELETE /api/rooms/[id]
 * Admin only: deletes room if currentOccupancy === 0.
 */
export async function DELETE(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid room ID format", 400);
    }

    await connectDB();

    const result = await deleteRoom(id);
    return success(result, "Room deleted successfully");
  } catch (error) {
    console.error("[API_ROOM_DELETE_ERROR]:", error);
    return failure(error.message || "Failed to delete room", 400);
  }
}
