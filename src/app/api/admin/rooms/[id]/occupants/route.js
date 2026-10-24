import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import Allocation from "@/models/Allocation";
import Room from "@/models/Room";

/**
 * GET /api/admin/rooms/[id]/occupants
 * Retrieves active occupants allocated to a physical room.
 * 
 * Access: Administrator only.
 */
export async function GET(request, { params }) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid room ID", 400);
    }

    await connectDB();

    const room = await Room.findById(id).populate("hostel", "name code").lean();
    if (!room) {
      return failure("Room not found", 404);
    }

    const allocations = await Allocation.find({
      room: id,
      status: "active",
    })
      .populate("student", "name email phone registrationNumber course department year")
      .populate("group", "status averageScore targetSize")
      .lean();

    const occupants = allocations.map((a) => ({
      allocationId: a._id,
      allocatedAt: a.allocatedAt,
      student: a.student,
      group: a.group,
      isDemo: a.isDemo,
    }));

    return success(
      {
        room: {
          id: room._id,
          roomNumber: room.roomNumber,
          floor: room.floor,
          capacity: room.capacity,
          currentOccupancy: room.currentOccupancy,
          roomType: room.roomType,
          status: room.status,
          hostel: room.hostel,
        },
        occupants,
      },
      "Room occupants retrieved successfully"
    );
  } catch (error) {
    console.error("[Get Room Occupants Error]:", error);
    return failure(error.message || "Failed to retrieve room occupants", error.status || 500);
  }
}
