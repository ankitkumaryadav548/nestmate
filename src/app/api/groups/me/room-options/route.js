import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getRoomOptions } from "@/services/roomPreferenceService";

/**
 * GET /api/groups/me/room-options
 * Retrieves campus hostels eligible for the student's group or auto-allocation choice,
 * with aggregated real-time capacity and AC availability counts.
 * Role: Student only.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const options = await getRoomOptions(user.id);
    return success(options, "Eligible room options retrieved successfully");
  } catch (error) {
    console.error("[Get Room Options Error]:", error);
    return failure(error.message || "Failed to retrieve room options", 400);
  }
}
