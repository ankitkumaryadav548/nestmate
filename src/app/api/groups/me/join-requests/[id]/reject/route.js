import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { rejectJoinRequest } from "@/services/joinRequestService";

/**
 * POST /api/groups/me/join-requests/[id]/reject
 * Declines an incoming join request and sets cooldown.
 */
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid request ID", 400);
    }

    const result = await rejectJoinRequest(user.id, id);
    return success(result, "Join request declined successfully");
  } catch (error) {
    console.error("[Reject Join Request Error]:", error);
    return failure(
      error.message || "Failed to decline join request",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

