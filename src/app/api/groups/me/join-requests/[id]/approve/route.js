import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { approveJoinRequest } from "@/services/joinRequestService";

/**
 * POST /api/groups/me/join-requests/[id]/approve
 * Atomically approves a join request and admits the requester to the group.
 */
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid request ID", 400);
    }

    const result = await approveJoinRequest(user.id, id);
    return success(result, "Join request approved successfully");
  } catch (error) {
    console.error("[Approve Join Request Error]:", error);
    return failure(
      error.message || "Failed to approve join request",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

