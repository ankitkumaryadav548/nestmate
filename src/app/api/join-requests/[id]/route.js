import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { cancelJoinRequest } from "@/services/joinRequestService";

/**
 * DELETE /api/join-requests/[id]
 * Cancels a pending join request previously sent by the current student.
 */
export async function DELETE(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid request ID", 400);
    }

    const result = await cancelJoinRequest(user.id, id);
    return success(result, "Join request cancelled successfully");
  } catch (error) {
    console.error("[Cancel Join Request Error]:", error);
    return failure(
      error.message || "Failed to cancel join request",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

