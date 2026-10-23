import mongoose from "mongoose";
import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { sendInvitation } from "@/services/groupService";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const inviteSchema = z.object({
  userId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
    message: "Invalid student ID format",
  }),
});

/**
 * POST /api/groups/me/invitations
 * Sends an invitation to an eligible student.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    // Rate limiting: max 15 invitation calls per minute
    const ip = getClientIp(request);
    const limiter = rateLimit(`invite_action_${user.id || ip}`, 15, 60 * 1000);
    if (!limiter.allowed) {
      return failure("Too many invitation requests. Please slow down.", 429);
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = inviteSchema.safeParse(body);

    if (!parseResult.success) {
      return failure("Validation failed", 400, parseResult.error.format());
    }

    const invitation = await sendInvitation(user.id, parseResult.data.userId);
    return success(invitation, "Roommate invitation sent successfully", 201);
  } catch (error) {
    console.error("[Send Invitation Error]:", error);
    return failure(error.message || "Failed to send invitation", 400);
  }
}
