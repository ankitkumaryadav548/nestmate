import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getMyGroup, disbandGroup } from "@/services/groupService";

/**
 * GET /api/groups/me
 * Retrieves current active roommate group for the student.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const group = await getMyGroup(user.id);
    return success(group, "Group details retrieved successfully");
  } catch (error) {
    console.error("[Get My Group Error]:", error);
    return failure("Failed to retrieve roommate group", 500);
  }
}


/**
 * DELETE /api/groups/me
 * Disbands active group (leader only).
 */
export async function DELETE(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const disbanded = await disbandGroup(user.id);
    return success(disbanded, "Roommate group disbanded successfully");
  } catch (error) {
    console.error("[Disband Group Error]:", error);
    return failure(error.message || "Failed to disband roommate group", 400);
  }
}
