import { z } from "zod";
import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getPreferences, upsertPreferences } from "@/services/studentService";

const preferencesSchema = z.object({
  roomSize: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().int().min(1, "Room size must be between 1 and 4").max(4, "Room size must be between 1 and 4").nullable().optional()
    ),
  sleepSchedule: z
    .enum(["early", "normal", "late"], {
      errorMap: () => ({ message: "Please select an option for sleep schedule" }),
    })
    .nullable()
    .optional(),
  studyTime: z
    .enum(["morning", "daytime", "night", "flexible"], {
      errorMap: () => ({ message: "Please select your preferred study time" }),
    })
    .nullable()
    .optional(),
  nightCalls: z
    .enum(["never", "sometimes", "often"], {
      errorMap: () => ({ message: "Please select late-night call frequency" }),
    })
    .nullable()
    .optional(),
  cleanliness: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().int().min(1, "Cleanliness must be between 1 and 5").max(5, "Cleanliness must be between 1 and 5").nullable().optional()
    ),
  noiseTolerance: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().int().min(1, "Noise tolerance must be between 1 and 5").max(5, "Noise tolerance must be between 1 and 5").nullable().optional()
    ),
  socialLevel: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().int().min(1, "Social level must be between 1 and 5").max(5, "Social level must be between 1 and 5").nullable().optional()
    ),
  acPreference: z
    .enum(["ac", "non-ac", "no-preference"], {
      errorMap: () => ({ message: "Please select your AC preference" }),
    })
    .nullable()
    .optional(),
  foodType: z
    .enum(["veg", "non-veg", "eggetarian", "halal", "jain"], {
      errorMap: () => ({ message: "Please select a valid dietary type" }),
    })
    .nullable()
    .optional(),
  okWithDifferentFood: z.boolean({
    errorMap: () => ({ message: "Please indicate if you are comfortable sharing with different diets" }),
  }).nullable().optional(),
  languages: z
    .array(z.string().trim().min(1, "Language name cannot be empty"))
    .optional()
    .default([]),
  culturalComfort: z
    .enum(["open-to-all", "prefer-similar-background", "no-preference"])
    .optional()
    .default("no-preference"),
  dealBreakers: z
    .array(z.enum(["food", "lateNightNoise", "visitors", "cleanliness", "acType"]))
    .optional()
    .default([]),
});

/**
 * GET /api/students/me/preferences
 * Retrieves current student's questionnaire preferences and deal-breakers.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    await connectDB();
    const preferences = await getPreferences(user._id);

    return success(preferences, "Student preferences retrieved successfully");
  } catch (error) {
    console.error("[API_STUDENT_GET_PREFERENCES_ERROR]:", error);
    return failure(error.message || "Failed to retrieve student preferences", 500);
  }
}

/**
 * PUT /api/students/me/preferences
 * Updates student preferences, validates answers, and marks completedAt if all required items are answered.
 */
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => null);
    if (!body) {
      return failure("Invalid JSON payload", 400);
    }

    const validation = preferencesSchema.safeParse(body);
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.issues.forEach((err) => {
        const field = err.path.join(".") || "general";
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      return failure("Preferences validation failed", 400, fieldErrors);
    }

    await connectDB();

    // Check room size change validity
    const newRoomSize = validation.data.roomSize !== undefined ? validation.data.roomSize : undefined;
    if (newRoomSize !== undefined) {
      const currentPref = await getPreferences(user._id);
      const currentRoomSize = currentPref?.roomSize ?? null;

      if (newRoomSize !== currentRoomSize) {
        const RoommateGroup = (await import("@/models/RoommateGroup")).default;
        const Allocation = (await import("@/models/Allocation")).default;
        const { validateRoomSizeChange } = await import("@/services/roomSize/roomSizeRules");

        const activeGroup = await RoommateGroup.findOne({
          "members.user": user._id,
          status: { $in: ["forming", "complete", "locked"] },
        }).lean();

        const activeAlloc = await Allocation.findOne({
          student: user._id,
          status: "active",
        }).lean();

        const check = validateRoomSizeChange({
          currentRoomSize,
          newRoomSize,
          inActiveGroup: Boolean(activeGroup),
          hasAllocation: Boolean(activeAlloc),
        });

        if (!check.allowed) {
          return failure(check.reason, 409);
        }
      }
    }

    const updated = await upsertPreferences(user._id, validation.data);

    return success(updated, "Preferences saved successfully");
  } catch (error) {
    console.error("[API_STUDENT_PUT_PREFERENCES_ERROR]:", error);
    return failure(error.message || "Failed to save preferences", 500);
  }
}
