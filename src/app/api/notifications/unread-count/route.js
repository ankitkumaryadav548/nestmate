import { requireAuth } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getUnreadCount } from "@/services/notificationService";

/**
 * GET /api/notifications/unread-count
 * Returns single indexed unread notification count for authenticated user.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    // Role re-check
    if (!["student", "admin"].includes(user.role)) {
      return failure("Access denied: Invalid user role", 403);
    }

    const unreadCount = await getUnreadCount(user.id);
    return success({ unreadCount }, "Unread notification count retrieved.");
  } catch (err) {
    console.error("[GET /api/notifications/unread-count Error]:", err);
    return failure("Failed to retrieve unread notification count.", 500);
  }
}
