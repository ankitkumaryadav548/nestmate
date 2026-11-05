import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getRoommatesAndBeds } from "@/services/bedService";

/**
 * GET /api/roommates/me
 * Retrieves the authenticated student's active room, roommates, and bed occupancy.
 *
 * Access: Authenticated students with an active allocation only.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const data = await getRoommatesAndBeds(user.id || user.userId);
    return success(data, "Roommates and bed layout retrieved successfully");
  } catch (error) {
    console.error("[Get Roommates & Beds Error]:", error);
    return failure(
      error.message || "Failed to retrieve roommate and bed details",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

