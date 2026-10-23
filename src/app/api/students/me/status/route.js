import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getCompletionStatus } from "@/services/studentService";

/**
 * GET /api/students/me/status
 * Returns completion status for the logged-in student:
 * { profileCompleted: boolean, preferencesCompleted: boolean, percentage: number }
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    await connectDB();
    const status = await getCompletionStatus(user._id);

    return success(status, "Student status retrieved successfully");
  } catch (error) {
    console.error("[API_STUDENT_STATUS_ERROR]:", error);
    return failure(error.message || "Failed to retrieve student status", 500);
  }
}
