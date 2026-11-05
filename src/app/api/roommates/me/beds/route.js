import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";
import { assignBeds } from "@/services/bedService";

const putBedsSchema = z.object({
  assignments: z
    .array(
      z.object({
        userId: z.string().min(1, "User ID is required"),
        bedNumber: z.number().int().nullable().optional(),
      })
    )
    .min(1, "At least one bed assignment is required"),
});

/**
 * PUT /api/roommates/me/beds
 * Updates bed number assignments for members of the current room.
 *
 * Access: Authenticated group leader (or single student) only.
 */
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    // Rate limiting: 30 requests per minute
    const rl = rateLimit(`bed_assign_${user.id || user.userId}`, 30, 60 * 1000);
    if (!rl.allowed) {
      return failure("Rate limit exceeded for bed assignment. Please wait a moment before trying again.", 429);
    }

    const body = await request.json().catch(() => ({}));
    const parseRes = putBedsSchema.safeParse(body);
    if (!parseRes.success) {
      const msg = parseRes.error.issues?.[0]?.message || "Invalid bed assignment data";
      return failure(msg, 400);
    }

    const result = await assignBeds(user.id || user.userId, parseRes.data.assignments);
    return success(result, "Bed assignments updated successfully");
  } catch (error) {
    console.error("[Assign Beds Error]:", error);
    return failure(
      error.message || "Failed to update bed assignments",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

