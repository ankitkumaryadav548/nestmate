import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getSettings, updateSettings } from "@/services/matchingService";

const weightsSchema = z.object({
  sleepSchedule: z.coerce.number().min(0).max(100),
  studyTime: z.coerce.number().min(0).max(100),
  cleanliness: z.coerce.number().min(0).max(100),
  noiseTolerance: z.coerce.number().min(0).max(100),
  foodType: z.coerce.number().min(0).max(100),
  socialLevel: z.coerce.number().min(0).max(100),
  languageAndCalls: z.coerce.number().min(0).max(100),
});

const updateSettingsSchema = z.object({
  weights: weightsSchema.refine(
    (w) => {
      const sum = Object.values(w).reduce((acc, curr) => acc + curr, 0);
      return Math.round(sum) === 100;
    },
    { message: "Weights must sum to exactly 100%" }
  ),
  yearBonus: z
    .object({
      sameYear: z.coerce.number().min(0).max(50).default(5),
      oneYearApart: z.coerce.number().min(0).max(50).default(2),
      otherwise: z.coerce.number().min(0).max(50).default(0),
    })
    .optional(),
});

/**
 * GET /api/admin/matching/settings
 * Retrieves active matching algorithm weights and bonus points.
 */
export async function GET(request) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const settings = await getSettings();
    return success(settings, "Matching settings retrieved successfully");
  } catch (error) {
    console.error("[Get Matching Settings Error]:", error);
    return failure("Failed to retrieve matching settings", 500);
  }
}

/**
 * PUT /api/admin/matching/settings
 * Updates matching algorithm weights (strictly validating total = 100).
 */
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const parseResult = updateSettingsSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.format();
      return failure("Validation failed", 400, errors);
    }

    const updated = await updateSettings(user.id, parseResult.data);
    return success(updated, "Matching settings updated successfully");
  } catch (error) {
    console.error("[Update Matching Settings Error]:", error);
    return failure(error.message || "Failed to update matching settings", 400);
  }
}
