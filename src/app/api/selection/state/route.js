import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getSelectionState } from "@/services/roomSelectionService";

/**
 * GET /api/selection/state
 * Returns active window state, countdown info, group composition, and student eligibility.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const state = await getSelectionState(user.id);
    return success(state, "Selection state retrieved successfully");
  } catch (error) {
    console.error("[Selection State Error]:", error);
    return failure(
      error.message || "Failed to retrieve selection state",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

