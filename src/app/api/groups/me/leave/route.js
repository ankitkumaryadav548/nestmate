import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { leaveGroup } from "@/services/groupService";

/**
 * POST /api/groups/me/leave
 * Removes the authenticated student from their current active group.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const result = await leaveGroup(user.id);
    return success(result, "Successfully left the roommate group");
  } catch (error) {
    console.error("[Leave Group Error]:", error);
    return failure(error.message || "Failed to leave roommate group", 400);
  }
}
