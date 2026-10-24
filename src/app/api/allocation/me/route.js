import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getMyAllocation } from "@/services/studentAllocationService";

/**
 * GET /api/allocation/me
 * Retrieves the authenticated student's finalized room allocation and roommates,
 * or waitlist/pending status.
 * 
 * Access: Authenticated students only.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const allocationData = await getMyAllocation(user.userId);
    return success(allocationData, "Allocation details retrieved successfully");
  } catch (error) {
    console.error("[Get My Allocation Error]:", error);
    return failure(error.message || "Failed to retrieve allocation details", error.status || 500);
  }
}
