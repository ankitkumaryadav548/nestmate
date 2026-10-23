import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getPairResult } from "@/services/matchingService";

/**
 * GET /api/admin/matching/pair?studentA=...&studentB=...
 * 
 * Admin tool to inspect pairwise compatibility between any two students.
 * Provides transparent diagnostics including deal-breaker triggers, gender mismatches,
 * and questionnaire completion statuses.
 */
export async function GET(request) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const studentA = searchParams.get("studentA");
    const studentB = searchParams.get("studentB");

    if (!studentA || !studentB) {
      return failure("Both studentA and studentB query parameters are required", 400);
    }

    if (
      !mongoose.Types.ObjectId.isValid(studentA) ||
      !mongoose.Types.ObjectId.isValid(studentB)
    ) {
      return failure("Invalid student ID format. Must be valid MongoDB ObjectIds", 400);
    }

    if (studentA === studentB) {
      return failure("Cannot evaluate a student against themselves", 400);
    }

    const pairResult = await getPairResult(studentA, studentB, { forAdmin: true });

    if (pairResult.notFound) {
      return failure(pairResult.message, 404);
    }

    return success(pairResult, "Pair evaluation completed");
  } catch (error) {
    console.error("[Admin Pair Evaluation Error]:", error);
    return failure("Failed to evaluate student pair", 500);
  }
}
