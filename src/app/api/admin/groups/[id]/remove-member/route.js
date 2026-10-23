import mongoose from "mongoose";
import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { adminRemoveMember } from "@/services/groupService";

const removeMemberSchema = z.object({
  userId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
    message: "Invalid student user ID",
  }),
});

/**
 * POST /api/admin/groups/[id]/remove-member
 * Admin override to remove a member from a forming or complete group.
 */
export async function POST(request, { params }) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parseResult = removeMemberSchema.safeParse(body);

    if (!parseResult.success) {
      return failure("Validation failed", 400, parseResult.error.format());
    }

    const updated = await adminRemoveMember(id, parseResult.data.userId);
    return success(updated, "Member removed from group successfully");
  } catch (error) {
    console.error("[Admin Remove Member Error]:", error);
    return failure(error.message || "Failed to remove member", 400);
  }
}
