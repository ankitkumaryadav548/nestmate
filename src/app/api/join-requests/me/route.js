import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { listMySentRequests } from "@/services/joinRequestService";

/**
 * GET /api/join-requests/me
 * Retrieves all join requests sent by the current student.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const data = await listMySentRequests(user.id);
    return success(data, "Sent join requests retrieved successfully");
  } catch (error) {
    console.error("[List Sent Requests Error]:", error);
    return failure(
      error.message || "Failed to retrieve sent requests",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

