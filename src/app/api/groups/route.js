import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { createGroup } from "@/services/groupService";
import { GROUP_SIZE_OPTIONS } from "@/config/groups";

const createGroupSchema = z.object({
  targetSize: z.coerce.number().refine((val) => GROUP_SIZE_OPTIONS.includes(val), {
    message: `Target size must be one of: [${GROUP_SIZE_OPTIONS.join(", ")}]`,
  }),
});

/**
 * POST /api/groups
 * Creates a new forming roommate group with the authenticated student as leader.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const parseResult = createGroupSchema.safeParse(body);

    if (!parseResult.success) {
      return failure("Validation failed", 400, parseResult.error.format());
    }

    const group = await createGroup(user.id, parseResult.data.targetSize);
    return success(group, "Roommate group created successfully", 201);
  } catch (error) {
    if (error.code === "PREFERENCES_INCOMPLETE") {
      return failure("Complete your preferences first", 409, {
        code: "PREFERENCES_INCOMPLETE",
      });
    }
    console.error("[Create Group Error]:", error);
    return failure(error.message || "Failed to create roommate group", 400);
  }
}
