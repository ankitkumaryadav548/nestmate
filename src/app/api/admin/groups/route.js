import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { adminListGroups } from "@/services/groupService";

/**
 * GET /api/admin/groups
 * Retrieves paginated groups with filters for status, size, gender, search, and demo flags.
 */
export async function GET(request) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const targetSize = searchParams.get("targetSize");
    const gender = searchParams.get("gender");
    const search = searchParams.get("search");
    const isDemo = searchParams.get("isDemo");
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 20;

    const result = await adminListGroups(
      { status, targetSize, gender, search, isDemo },
      { page, limit }
    );

    return success(result, "Groups retrieved successfully");
  } catch (error) {
    console.error("[Admin List Groups Error]:", error);
    return failure("Failed to retrieve groups", 500);
  }
}
