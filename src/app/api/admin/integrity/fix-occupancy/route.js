import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { fixOccupancy } from "@/services/integrityService";

/**
 * POST /api/admin/integrity/fix-occupancy
 * Repairs room occupancy discrepancies using active Allocation records as the single source of truth.
 * 
 * Access: Administrator only.
 */
export async function POST(request) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const result = await fixOccupancy();
    return success(
      result,
      `Room occupancy repaired: updated ${result.repairedCount} of ${result.roomsExamined} rooms.`
    );
  } catch (error) {
    console.error("[Fix Occupancy Error]:", error);
    return failure(error.message || "Failed to fix room occupancy", error.status || 500);
  }
}
