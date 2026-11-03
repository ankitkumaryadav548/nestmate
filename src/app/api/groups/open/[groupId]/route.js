import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getOpenGroup } from "@/services/joinRequestService";

/**
 * GET /api/groups/open/[groupId]
 * Returns detailed open group info for a student, including compatibility breakdown and join impact preview.
 */
export async function GET(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { groupId } = await params;
    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return failure("Invalid group ID", 400);
    }

    const result = await getOpenGroup(user.id, groupId);
    return success(result, "Open group details retrieved successfully");
  } catch (error) {
    console.error("[Get Open Group Error]:", error);
    return failure(
      error.message || "Failed to retrieve group details",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

