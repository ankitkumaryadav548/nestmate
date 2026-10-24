import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";
import { runAllocation } from "@/services/allocationService";

// Allocation simulation evaluates combinations and baseline trials; allocate up to 60s for serverless execution
export const maxDuration = 60;

/**
 * POST /api/admin/allocations/run
 * Initiates an automated hostel allocation simulation run in draft mode.
 * 
 * Access: Administrator only.
 * Rate Limit: 5 runs per 10 minutes per admin user.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    // Apply rate limiter: 5 allocation runs per 10 minutes
    const limiterKey = `alloc_run_${user.id}`;
    const rl = rateLimit(limiterKey, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return failure("Too many allocation simulations started. Please wait before starting another run.", 429);
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result = await runAllocation(user.id, body, { persist: true });

    return success(result, "Allocation simulation run completed successfully", 201);
  } catch (error) {
    console.error("[Allocation Run Error]:", error);

    if (error.code === "ALLOCATION_IN_PROGRESS" || error.status === 409) {
      return failure(error.message, 409);
    }

    if (error.name === "ZodError") {
      const messages = error.errors?.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return failure(`Invalid allocation parameters: ${messages}`, 400);
    }

    return failure(error.message || "Failed to execute allocation run", error.status || 500);
  }
}
