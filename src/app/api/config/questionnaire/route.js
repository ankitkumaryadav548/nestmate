import { requireAuth } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import {
  QUESTIONS,
  DEAL_BREAKER_OPTIONS,
  LANGUAGE_OPTIONS,
  COURSE_YEAR_LIMITS,
  QUESTIONNAIRE_STEPS,
} from "@/config/questionnaire";

/**
 * GET /api/config/questionnaire
 * Returns the questionnaire configuration, step definitions, and allowed options.
 * Accessible to any authenticated user (student or admin).
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    return success(
      {
        questions: QUESTIONS,
        dealBreakers: DEAL_BREAKER_OPTIONS,
        languages: LANGUAGE_OPTIONS,
        courseYearLimits: COURSE_YEAR_LIMITS,
        steps: QUESTIONNAIRE_STEPS,
      },
      "Questionnaire configuration retrieved successfully"
    );
  } catch (error) {
    console.error("[API_CONFIG_QUESTIONNAIRE_ERROR]:", error);
    return failure("Failed to load questionnaire configuration", 500);
  }
}
