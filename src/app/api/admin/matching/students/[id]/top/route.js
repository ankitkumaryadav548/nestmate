import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getAdminStudentTopMatches } from "@/services/matchingService";

/**
 * GET /api/admin/matching/students/[id]/top?limit=10
 * 
 * Retrieves top matches for any specified student with full administrative diagnostics.
 */
export async function GET(request, { params }) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid student ID format", 400);
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));

    const result = await getAdminStudentTopMatches(id, limit);

    return success(result, "Top matches for student retrieved successfully");
  } catch (error) {
    if (error.code === "PREFERENCES_INCOMPLETE") {
      return failure(
        "Student has not completed their lifestyle questionnaire yet.",
        400,
        { code: "PREFERENCES_INCOMPLETE" }
      );
    }
    console.error("[Admin Top Matches Error]:", error);
    return failure(error.message || "Failed to retrieve top matches for student", 500);
  }
}
