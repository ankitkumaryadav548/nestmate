import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { listIncomingRequests } from "@/services/joinRequestService";

/**
 * GET /api/groups/me/join-requests
 * Lists incoming join requests for the leader of a forming group.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const data = await listIncomingRequests(user.id);
    return success(data, "Incoming join requests retrieved successfully");
  } catch (error) {
    console.error("[List Incoming Join Requests Error]:", error);
    return failure(
      error.message || "Failed to retrieve incoming join requests",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

