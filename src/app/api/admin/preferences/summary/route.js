import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getPreferencesDemandSummary } from "@/services/roomPreferenceService";

/**
 * GET /api/admin/preferences/summary
 * Aggregates student demand (first-choice hostels, AC vs non-AC, room size request counts)
 * versus actual live room and bed inventory for residential administrative planning.
 * Role: Admin only.
 */
export async function GET(request) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const summary = await getPreferencesDemandSummary();
    return success(summary, "Room preferences demand summary retrieved successfully");
  } catch (error) {
    console.error("[Admin Preferences Summary Error]:", error);
    return failure(error.message || "Failed to retrieve preferences summary", 500);
  }
}
