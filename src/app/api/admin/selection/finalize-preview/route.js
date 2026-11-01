import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { previewFinalize } from "@/services/selectionFinalizeService";

/**
 * GET /api/admin/selection/finalize-preview
 * Returns read-only deterministic preview of lock and auto-fill operations.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const preview = await previewFinalize();
    return success(preview, "Finalize preview generated successfully");
  } catch (error) {
    console.error("[Finalize Preview Error]:", error);
    return failure(
      error.message || "Failed to generate finalize preview",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

