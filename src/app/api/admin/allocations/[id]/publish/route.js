import mongoose from "mongoose";
import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { publishRun } from "@/services/publishService";

const publishSchema = z.object({
  confirmText: z.literal("PUBLISH", {
    errorMap: () => ({ message: 'You must type "PUBLISH" to confirm live publication' }),
  }),
});

/**
 * POST /api/admin/allocations/[id]/publish
 * Atomically publishes a draft allocation run into live room occupancy and locked groups.
 * 
 * Access: Administrator only.
 */
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const ip = getClientIp(request);
    const limit = rateLimit(`publish_run_${ip}`, 5, 60 * 1000); // 5 publish attempts / min
    if (!limit.allowed) {
      return failure("Rate limit exceeded for publication. Please wait before retrying.", 429);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid allocation run ID", 400);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = publishSchema.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || 'Confirmation text must be "PUBLISH"';
      return failure(msg, 400);
    }

    const adminId = user._id || user.id || user.userId;
    const result = await publishRun(adminId, id, parsed.data);
    return success(result, "Allocation run published successfully");
  } catch (error) {
    console.error("[Publish Run Error]:", error);
    return failure(error.message || "Failed to publish allocation run", error.status || 500);
  }
}
