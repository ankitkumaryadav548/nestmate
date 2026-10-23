import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getIntent, setIntent } from "@/services/groupService";
import { GROUP_SIZE_OPTIONS } from "@/config/groups";

const intentSchema = z.object({
  mode: z.enum(["group", "auto"]),
  preferredRoomSize: z.coerce.number().refine((s) => GROUP_SIZE_OPTIONS.includes(s), {
    message: `Preferred room size must be one of: [${GROUP_SIZE_OPTIONS.join(", ")}]`,
  }),
});

/**
 * GET /api/students/me/intent
 * Retrieves the student's allocation intent.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const intent = await getIntent(user.id);
    return success(intent, "Allocation intent retrieved successfully");
  } catch (error) {
    console.error("[Get Intent Error]:", error);
    return failure("Failed to retrieve allocation intent", 500);
  }
}

/**
 * PUT /api/students/me/intent
 * Updates student's allocation intent (cannot choose "auto" if in an active group).
 */
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const parseResult = intentSchema.safeParse(body);

    if (!parseResult.success) {
      return failure("Validation failed", 400, parseResult.error.format());
    }

    const updated = await setIntent(user.id, parseResult.data);
    return success(updated, "Allocation intent saved successfully");
  } catch (error) {
    console.error("[Set Intent Error]:", error);
    return failure(error.message || "Failed to update allocation intent", 400);
  }
}
