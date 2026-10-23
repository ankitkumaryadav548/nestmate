import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { removeMember } from "@/services/groupService";

/**
 * POST /api/groups/me/members/[userId]/remove
 * Removes a member from the forming group (leader only).
 */
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { userId } = await params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return failure("Invalid member student ID", 400);
    }

    const updated = await removeMember(user.id, userId);
    return success(updated, "Member removed from group successfully");
  } catch (error) {
    console.error("[Remove Member Error]:", error);
    return failure(error.message || "Failed to remove member", 400);
  }
}
