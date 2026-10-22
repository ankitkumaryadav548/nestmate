import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { createRoomsBulk } from "@/services/roomService";
import { z } from "zod";

const bulkRoomSchema = z.object({
  hostelId: z.string().min(1, "Hostel ID is required"),
  floor: z.coerce.number().int().min(0, "Floor must be 0 or higher"),
  startNumber: z.coerce.number().int().min(1, "Start number must be at least 1"),
  count: z.coerce.number().int().min(1, "Count must be at least 1").max(200, "Maximum count is 200 rooms per request"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(6, "Max capacity is 6"),
  roomType: z.enum(["AC", "Non-AC"], {
    errorMap: () => ({ message: "Room type must be AC or Non-AC" }),
  }),
  roomNumberPrefix: z.string().trim().optional().default(""),
});

/**
 * POST /api/rooms/bulk
 * Admin only: bulk creates rooms, skipping duplicates.
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

    const validation = bulkRoomSchema.safeParse(body);
    if (!validation.success) {
      return failure("Validation failed", 400, validation.error.format());
    }

    const summary = await createRoomsBulk(validation.data);
    return success(
      summary,
      `Bulk creation completed: ${summary.created} created, ${summary.skipped} skipped.`,
      201
    );
  } catch (error) {
    console.error("[API_ROOMS_BULK_ERROR]:", error);
    return failure(error.message || "Failed to create rooms in bulk", 400);
  }
}
