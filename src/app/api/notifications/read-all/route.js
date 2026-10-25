import { requireAuth } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { markAllRead } from "@/services/notificationService";

/**
 * POST /api/notifications/read-all
 * Marks all notifications (or all in an optional category) as read for session user.
 * 
 * Body (optional JSON):
 * - category?: string
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    // Role re-check
    if (!["student", "admin"].includes(user.role)) {
      return failure("Access denied: Invalid user role", 403);
    }

    let category = null;
    try {
      const body = await request.json();
      if (body && typeof body.category === "string") {
        category = body.category.trim();
      }
    } catch {
      // Body is optional
    }

    const result = await markAllRead(user.id, category);
    return success(result, "All selected notifications marked as read.");
  } catch (err) {
    console.error("[POST /api/notifications/read-all Error]:", err);
    return failure("Failed to mark notifications as read.", 500);
  }
}
