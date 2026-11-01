import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { releaseRoom } from "@/services/roomSelectionService";

/**
 * POST /api/selection/release
 * Releases a previously claimed room during an open selection window.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const result = await releaseRoom(user.id);
    return success(result, "Room released successfully", 200);
  } catch (error) {
    console.error("[Release Room Error]:", error);
    return failure(
      error.message || "Failed to release room",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

