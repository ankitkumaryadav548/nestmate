import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";
import { selectRoom } from "@/services/roomSelectionService";
import { SELECTION_RATE_LIMIT } from "@/config/selection";

const selectSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
});

/**
 * POST /api/selection/select
 * Claims a free room immediately (First-Come, First-Served).
 * Rate-limited to SELECTION_RATE_LIMIT requests/min.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    // Apply rate limiter
    const rl = rateLimit(`select_room_${user.id}`, SELECTION_RATE_LIMIT, 60 * 1000);
    if (!rl.allowed) {
      return failure("Rate limit exceeded for room selection. Please wait a moment before trying again.", 429);
    }

    const body = await request.json().catch(() => ({}));
    const parseRes = selectSchema.safeParse(body);
    if (!parseRes.success) {
      return failure(parseRes.error.errors[0]?.message || "Invalid room selection payload", 400);
    }

    const result = await selectRoom(user.id, parseRes.data.roomId);
    return success(result, "Room selected successfully", 200);
  } catch (error) {
    console.error("[Select Room Error]:", error);
    return failure(
      error.message || "Failed to select room",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

