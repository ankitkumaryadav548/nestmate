import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { listOpenGroups } from "@/services/joinRequestService";

/**
 * GET /api/groups/open
 * Lists forming groups with free seats matching the student's gender and room size.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const query = {
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      minScore: searchParams.get("minScore") || 0,
      sameYearOnly: searchParams.get("sameYearOnly") === "true",
      sharedLanguageOnly: searchParams.get("sharedLanguageOnly") === "true",
    };

    const result = await listOpenGroups(user.id, query);
    return success(result, "Open groups retrieved successfully");
  } catch (error) {
    console.error("[List Open Groups Error]:", error);
    return failure(
      error.message || "Failed to retrieve open groups",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

