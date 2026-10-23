import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { adminDisbandGroup } from "@/services/groupService";

/**
 * POST /api/admin/groups/[id]/disband
 * Admin override to dissolve a forming or complete group.
 */
export async function POST(request, { params }) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const disbanded = await adminDisbandGroup(id);

    return success(disbanded, "Group disbanded successfully");
  } catch (error) {
    console.error("[Admin Disband Group Error]:", error);
    return failure(error.message || "Failed to disband group", 400);
  }
}
