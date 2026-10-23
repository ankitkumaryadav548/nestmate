import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getTopMatches } from "@/services/matchingService";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * GET /api/matches/me
 * 
 * Retrieves top compatible roommate matches for the authenticated student.
 * Uses session user ID; verifies completed preferences questionnaire.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    // Rate limiting: 60 requests per minute per student
    const ip = getClientIp(request);
    const limiter = rateLimit(`matches_me_${user.id || ip}`, 60, 60 * 1000);
    if (!limiter.allowed) {
      return failure("Too many requests. Please slow down.", 429);
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 20;
    const minScore = searchParams.get("minScore") || 0;
    const sameYearOnly = searchParams.get("sameYearOnly") === "true";
    const sharedLanguageOnly = searchParams.get("sharedLanguageOnly") === "true";

    const result = await getTopMatches(user.id, {
      page,
      limit,
      minScore,
      sameYearOnly,
      sharedLanguageOnly,
    });

    return success(result, "Roommate matches retrieved successfully");
  } catch (error) {
    if (error.code === "PREFERENCES_INCOMPLETE") {
      return failure("Complete your preferences first", 409, {
        code: "PREFERENCES_INCOMPLETE",
        redirectTo: "/dashboard/preferences",
      });
    }

    console.error("[Matches Me API Error]:", error);
    return failure(error.message || "Failed to calculate roommate matches", 500);
  }
}
