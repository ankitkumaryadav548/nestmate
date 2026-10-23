import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { resetSettings } from "@/services/matchingService";

/**
 * POST /api/admin/matching/settings/reset
 * Resets weights and bonus values to system defaults.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const defaults = await resetSettings(user.id);
    return success(defaults, "Matching settings reset to defaults successfully");
  } catch (error) {
    console.error("[Reset Matching Settings Error]:", error);
    return failure("Failed to reset matching settings", 500);
  }
}
