import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { listRuns } from "@/services/allocationService";

/**
 * GET /api/admin/allocations
 * Retrieves a paginated history of allocation runs.
 * 
 * Access: Administrator only.
 */
export async function GET(request) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await listRuns({ page, limit });

    return success(result, "Allocation runs retrieved successfully");
  } catch (error) {
    console.error("[List Allocations Error]:", error);
    return failure(error.message || "Failed to retrieve allocation runs", error.status || 500);
  }
}
