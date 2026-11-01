import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getCurrentWindow } from "@/services/selectionWindowService";
import { getSelectionOverview } from "@/services/selectionStatsService";

/**
 * GET /api/admin/selection
 * Returns current window status and overall selection live metrics.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const [currentWindow, overview] = await Promise.all([
      getCurrentWindow(),
      getSelectionOverview(),
    ]);

    return success({
      window: currentWindow,
      overview,
    }, "Selection dashboard overview retrieved successfully");
  } catch (error) {
    console.error("[Admin Selection Overview Error]:", error);
    return failure(
      error.message || "Failed to load selection overview",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

