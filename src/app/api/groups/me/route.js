import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getMyGroup, updateTargetSize, disbandGroup } from "@/services/groupService";
import { GROUP_SIZE_OPTIONS } from "@/config/groups";

const updateSizeSchema = z.object({
  targetSize: z.coerce.number().refine((val) => GROUP_SIZE_OPTIONS.includes(val), {
    message: `Target size must be one of: [${GROUP_SIZE_OPTIONS.join(", ")}]`,
  }),
});

/**
 * GET /api/groups/me
 * Retrieves current active roommate group for the student.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const group = await getMyGroup(user.id);
    return success(group, "Group details retrieved successfully");
  } catch (error) {
    console.error("[Get My Group Error]:", error);
    return failure("Failed to retrieve roommate group", 500);
  }
}

/**
 * PATCH /api/groups/me
 * Updates target room size (leader only).
 */
export async function PATCH(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const parseResult = updateSizeSchema.safeParse(body);

    if (!parseResult.success) {
      return failure("Validation failed", 400, parseResult.error.format());
    }

    const updated = await updateTargetSize(user.id, parseResult.data.targetSize);
    return success(updated, "Target size updated successfully");
  } catch (error) {
    console.error("[Update Target Size Error]:", error);
    return failure(error.message || "Failed to update target room size", 400);
  }
}

/**
 * DELETE /api/groups/me
 * Disbands active group (leader only).
 */
export async function DELETE(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const disbanded = await disbandGroup(user.id);
    return success(disbanded, "Roommate group disbanded successfully");
  } catch (error) {
    console.error("[Disband Group Error]:", error);
    return failure(error.message || "Failed to disband roommate group", 400);
  }
}
