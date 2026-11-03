import mongoose from "mongoose";
import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { sendJoinRequest } from "@/services/joinRequestService";

const sendRequestSchema = z.object({
  message: z.string().max(200, "Message cannot exceed 200 characters").optional(),
});

/**
 * POST /api/groups/open/[groupId]/join-requests
 * Sends a request to join an open forming group.
 */
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { groupId } = await params;
    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return failure("Invalid group ID", 400);
    }

    const body = await request.json().catch(() => ({}));
    const parseRes = sendRequestSchema.safeParse(body);
    if (!parseRes.success) {
      return failure(parseRes.error.errors[0]?.message || "Invalid payload", 400);
    }

    const result = await sendJoinRequest(user.id, groupId, parseRes.data);
    return success(result, "Join request sent successfully", 201);
  } catch (error) {
    console.error("[Send Join Request Error]:", error);
    return failure(
      error.message || "Failed to send join request",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

