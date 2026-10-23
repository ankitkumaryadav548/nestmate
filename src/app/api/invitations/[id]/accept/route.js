import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { acceptInvitation } from "@/services/groupService";

/**
 * POST /api/invitations/[id]/accept
 * Accepts an incoming invitation and atomically joins the roommate group.
 */
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid invitation ID", 400);
    }

    const updatedGroup = await acceptInvitation(user.id, id);
    return success(updatedGroup, "Invitation accepted! You have joined the group.");
  } catch (error) {
    console.error("[Accept Invitation Error]:", error);
    return failure(error.message || "Failed to accept invitation", 400);
  }
}
