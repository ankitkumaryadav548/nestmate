import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { cancelInvitation } from "@/services/groupService";

/**
 * DELETE /api/groups/me/invitations/[id]
 * Cancels an outgoing pending invitation (leader only).
 */
export async function DELETE(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid invitation ID", 400);
    }

    const cancelled = await cancelInvitation(user.id, id);
    return success(cancelled, "Invitation cancelled successfully");
  } catch (error) {
    console.error("[Cancel Invitation Error]:", error);
    return failure(error.message || "Failed to cancel invitation", 400);
  }
}
