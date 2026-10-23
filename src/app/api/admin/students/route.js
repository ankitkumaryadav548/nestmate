import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { listStudents } from "@/services/studentService";

/**
 * GET /api/admin/students
 * Admin only: retrieves paginated student list joined with Profile & Preferences via aggregation pipeline.
 * Query filters supported:
 * - search (name, email, registrationNumber)
 * - gender (male, female, other)
 * - year (1 to 6)
 * - isInternational (true, false)
 * - preferencesCompleted (true, false)
 * - isActive (true, false)
 * - isDemo (true, false)
 * - page, limit
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const gender = searchParams.get("gender") || "";
    const year = searchParams.get("year") || "";
    const isInternational = searchParams.get("isInternational") || "";
    const preferencesCompleted = searchParams.get("preferencesCompleted") || "";
    const isActive = searchParams.get("isActive") || "";
    const isDemo = searchParams.get("isDemo") || "";
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 10;

    await connectDB();

    const data = await listStudents(
      {
        search,
        gender,
        year,
        isInternational,
        preferencesCompleted,
        isActive,
        isDemo,
      },
      { page, limit }
    );

    return success(data, "Students list retrieved successfully");
  } catch (error) {
    console.error("[API_ADMIN_STUDENTS_LIST_ERROR]:", error);
    return failure(error.message || "Failed to retrieve student directory", 500);
  }
}
