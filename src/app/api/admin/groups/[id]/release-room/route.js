import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { adminReleaseRoom } from "@/services/selectionFinalizeService";

/**
 * POST /api/admin/groups/[id]/release-room
 * Administrative override: releases a group's selected room and deletes active allocations.
 */
export async function POST(request, context) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const params = await context.params;
    const { id: groupId } = params;

    const result = await adminReleaseRoom(groupId, user.id);
    return success(result, "Room released by administrator successfully", 200);
  } catch (error) {
    console.error("[Admin Release Room Error]:", error);
    return failure(
      error.message || "Failed to release room",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

