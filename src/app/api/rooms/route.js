import connectDB from "@/lib/db";
import { requireAuth, requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getRooms, createRoom } from "@/services/roomService";
import { z } from "zod";

const roomQuerySchema = z.object({
  hostelId: z.string().optional(),
  floor: z.coerce.number().int().min(0).optional(),
  roomType: z.enum(["AC", "Non-AC"]).optional(),
  status: z.enum(["available", "full", "maintenance"]).optional(),
  availableOnly: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z
    .enum(["roomNumber", "floor", "capacity", "currentOccupancy", "status", "createdAt"])
    .default("roomNumber"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

const createRoomSchema = z.object({
  hostelId: z.string().min(1, "Hostel ID is required"),
  roomNumber: z.string().trim().min(1, "Room number is required"),
  floor: z.coerce.number().int().min(0, "Floor must be 0 or higher"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(6, "Max capacity is 6"),
  roomType: z.enum(["AC", "Non-AC"], {
    errorMap: () => ({ message: "Room type must be AC or Non-AC" }),
  }),
  notes: z.string().trim().optional().default(""),
});

/**
 * GET /api/rooms
 * Returns filtered rooms. Students see only safe fields from eligible hostels.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    await connectDB();

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validation = roomQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return failure("Invalid query parameters", 400, validation.error.format());
    }

    const result = await getRooms(user, validation.data);
    return success(result, "Rooms retrieved successfully");
  } catch (error) {
    console.error("[API_ROOMS_GET_ERROR]:", error);
    return failure(error.message || "Failed to retrieve rooms", 500);
  }
}

/**
 * POST /api/rooms
 * Admin only: creates a single room.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch {
      return failure("Invalid JSON payload", 400);
    }

    const validation = createRoomSchema.safeParse(body);
    if (!validation.success) {
      return failure("Validation failed", 400, validation.error.format());
    }

    const room = await createRoom(validation.data);
    return success(room, "Room created successfully", 201);
  } catch (error) {
    console.error("[API_ROOMS_POST_ERROR]:", error);
    return failure(error.message || "Failed to create room", 400);
  }
}
