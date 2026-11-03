import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getRequestReview } from "@/services/joinRequestService";

/**
 * GET /api/groups/me/join-requests/[id]
 * Retrieves review details for a specific incoming join request (privacy safe).
 */
export async function GET(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid request ID", 400);
    }

    const data = await getRequestReview(user.id, id);
    return success(data, "Request review details retrieved successfully");
  } catch (error) {
    console.error("[Get Request Review Error]:", error);
    return failure(
      error.message || "Failed to retrieve request review",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

