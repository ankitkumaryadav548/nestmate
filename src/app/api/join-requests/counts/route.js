import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getMyRequestCounts } from "@/services/joinRequestService";

/**
 * GET /api/join-requests/counts
 * Returns badge counts for sent and incoming pending join requests.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const data = await getMyRequestCounts(user.id);
    return success(data, "Request counts retrieved successfully");
  } catch (error) {
    console.error("[Get Request Counts Error]:", error);
    return failure(
      error.message || "Failed to retrieve request counts",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

