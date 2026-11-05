import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";
import { autoAssignBeds } from "@/services/bedService";

/**
 * POST /api/roommates/me/beds/auto
 * Automatically assigns lowest free beds to unassigned roommates.
 *
 * Access: Authenticated group leader only.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    // Rate limiting: 20 requests per minute
    const rl = rateLimit(`bed_auto_${user.id || user.userId}`, 20, 60 * 1000);
    if (!rl.allowed) {
      return failure("Rate limit exceeded for auto-assigning beds. Please wait a moment before trying again.", 429);
    }

    const result = await autoAssignBeds(user.id || user.userId);
    return success(result, "Remaining beds auto-assigned successfully");
  } catch (error) {
    console.error("[Auto-Assign Beds Error]:", error);
    return failure(
      error.message || "Failed to auto-assign beds",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

