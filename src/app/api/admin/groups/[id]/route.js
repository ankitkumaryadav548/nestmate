import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { adminGetGroup } from "@/services/groupService";

/**
 * GET /api/admin/groups/[id]
 * Retrieves detailed group diagnostics, member lists, and pairwise breakdown.
 */
export async function GET(request, { params }) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const group = await adminGetGroup(id);

    return success(group, "Group details retrieved successfully");
  } catch (error) {
    console.error("[Admin Get Group Error]:", error);
    return failure(error.message || "Failed to retrieve group details", 404);
  }
}
