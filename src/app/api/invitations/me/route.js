import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { listMyInvitations } from "@/services/groupService";

/**
 * GET /api/invitations/me
 * Retrieves incoming roommate invitations for the authenticated student.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const data = await listMyInvitations(user.id);
    return success(data, "Invitations retrieved successfully");
  } catch (error) {
    console.error("[Get My Invitations Error]:", error);
    return failure("Failed to retrieve invitations", 500);
  }
}
