import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getAdminStats } from "@/services/statsService";

/**
 * GET /api/admin/stats
 * Admin only: retrieves system totals and hostel capacity/occupancy breakdowns.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    await connectDB();

    const stats = await getAdminStats();
    return success(stats, "Admin statistics retrieved successfully");
  } catch (error) {
    console.error("[API_ADMIN_STATS_ERROR]:", error);
    return failure(error.message || "Failed to retrieve admin stats", 500);
  }
}
