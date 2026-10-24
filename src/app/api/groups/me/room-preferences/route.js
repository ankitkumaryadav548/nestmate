import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import {
  getMyRoomPreferences,
  saveRoomPreferences,
  acknowledgePreferencesReview,
} from "@/services/roomPreferenceService";
import { AC_OPTIONS, FLOOR_OPTIONS } from "@/config/roomPreferences";

const savePreferencesSchema = z.object({
  preferredHostels: z
    .array(z.string().trim())
    .max(3, "You can select at most 3 preferred hostels")
    .optional()
    .default([]),
  acType: z
    .enum(AC_OPTIONS, {
      errorMap: () => ({ message: "Invalid AC type selection" }),
    })
    .optional()
    .default("no-preference"),
  floorPreference: z
    .enum(FLOOR_OPTIONS, {
      errorMap: () => ({ message: "Invalid floor preference selection" }),
    })
    .optional()
    .default("any"),
});

/**
 * GET /api/groups/me/room-preferences
 * Retrieves current saved preferences, suggested default AC, and soft warnings.
 * Role: Student only.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const data = await getMyRoomPreferences(user.id);
    return success(data, "Room preferences retrieved successfully");
  } catch (error) {
    console.error("[Get Room Preferences Error]:", error);
    return failure(error.message || "Failed to retrieve room preferences", 400);
  }
}

/**
 * PUT /api/groups/me/room-preferences
 * Saves soft room preferences for group leader or auto-assign student.
 * Validates hostel eligibility, capacity, and AC deal-breaker restrictions.
 * Role: Student only.
 */
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    let body = {};
    try {
      body = await request.json();
    } catch {
      return failure("Invalid JSON payload", 400);
    }

    const parseResult = savePreferencesSchema.safeParse(body);
    if (!parseResult.success) {
      return failure("Validation failed", 400, parseResult.error.flatten().fieldErrors);
    }

    const saved = await saveRoomPreferences(user.id, parseResult.data);
    return success(saved, "Room preferences saved successfully");
  } catch (error) {
    console.error("[Save Room Preferences Error]:", error);
    const status = error.statusCode || 400;
    return failure(error.message || "Failed to save room preferences", status);
  }
}

/**
 * POST /api/groups/me/room-preferences
 * Action dispatcher to acknowledge preferences review notice.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    await acknowledgePreferencesReview(user.id);
    return success(null, "Preferences review notice acknowledged");
  } catch (error) {
    console.error("[Ack Preferences Review Error]:", error);
    return failure(error.message || "Failed to acknowledge review notice", 400);
  }
}
