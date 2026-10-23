import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { declineInvitation } from "@/services/groupService";

/**
 * POST /api/invitations/[id]/decline
 * Declines an incoming roommate invitation.
 */
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid invitation ID", 400);
    }

    const declined = await declineInvitation(user.id, id);
    return success(declined, "Invitation declined");
  } catch (error) {
    console.error("[Decline Invitation Error]:", error);
    return failure(error.message || "Failed to decline invitation", 400);
  }
}
