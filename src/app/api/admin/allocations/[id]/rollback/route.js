import mongoose from "mongoose";
import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { rollbackRun } from "@/services/publishService";

const rollbackSchema = z.object({
  confirmText: z.literal("ROLLBACK", {
    errorMap: () => ({ message: 'You must type "ROLLBACK" to execute rollback' }),
  }),
});

/**
 * POST /api/admin/allocations/[id]/rollback
 * Atomically reverses the latest published allocation run, restoring prior group and room occupancy state.
 * 
 * Access: Administrator only.
 */
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const ip = getClientIp(request);
    const limit = rateLimit(`rollback_run_${ip}`, 5, 60 * 1000); // 5 rollback attempts / min
    if (!limit.allowed) {
      return failure("Rate limit exceeded for rollback. Please wait before retrying.", 429);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid allocation run ID", 400);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = rollbackSchema.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || 'Confirmation text must be "ROLLBACK"';
      return failure(msg, 400);
    }

    const adminId = user._id || user.id || user.userId;
    const result = await rollbackRun(adminId, id, parsed.data);
    return success(result, "Allocation run rolled back successfully");
  } catch (error) {
    console.error("[Rollback Run Error]:", error);
    return failure(error.message || "Failed to rollback allocation run", error.status || 500);
  }
}
