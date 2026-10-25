import { requireAuth } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { listMyNotifications, deleteAllRead } from "@/services/notificationService";

/**
 * GET /api/notifications
 * Lists paginated notifications for the authenticated session user.
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 50)
 * - unreadOnly: boolean
 * - category: string (invitations, groups, allocation, announcements)
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    // Role re-check
    if (!["student", "admin"].includes(user.role)) {
      return failure("Access denied: Invalid user role", 403);
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 20;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const category = searchParams.get("category") || null;

    const data = await listMyNotifications(user.id, {
      page,
      limit,
      unreadOnly,
      category,
    });

    return success(data, "Notifications retrieved successfully.");
  } catch (err) {
    console.error("[GET /api/notifications Error]:", err);
    return failure("Failed to retrieve notifications.", 500);
  }
}

/**
 * DELETE /api/notifications
 * Deletes all READ notifications belonging to the authenticated session user.
 */
export async function DELETE(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    // Role re-check
    if (!["student", "admin"].includes(user.role)) {
      return failure("Access denied: Invalid user role", 403);
    }

    const result = await deleteAllRead(user.id);
    return success(result, "Read notifications cleared successfully.");
  } catch (err) {
    console.error("[DELETE /api/notifications Error]:", err);
    return failure("Failed to clear notifications.", 500);
  }
}
