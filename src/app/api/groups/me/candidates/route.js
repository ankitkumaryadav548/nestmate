import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getGroupCandidates } from "@/services/groupService";

/**
 * GET /api/groups/me/candidates
 * Retrieves eligible roommate candidates that can join the leader's forming group.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 20;
    const minScore = searchParams.get("minScore") || 0;
    const sameYearOnly = searchParams.get("sameYearOnly") === "true";
    const sharedLanguageOnly = searchParams.get("sharedLanguageOnly") === "true";

    const result = await getGroupCandidates(user.id, {
      page,
      limit,
      minScore,
      sameYearOnly,
      sharedLanguageOnly,
    });

    return success(result, "Group candidates retrieved successfully");
  } catch (error) {
    console.error("[Get Group Candidates Error]:", error);
    return failure(error.message || "Failed to retrieve candidates for group", 400);
  }
}
