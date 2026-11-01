import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { createGroup } from "@/services/groupService";

/**
 * POST /api/groups
 * Creates a new forming roommate group with the authenticated student as leader.
 * Target size is derived automatically from the student's questionnaire roomSize.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const group = await createGroup(user.id);
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
