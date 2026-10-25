import mongoose from "mongoose";
import { requireAuth } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { markRead } from "@/services/notificationService";

/**
 * POST /api/notifications/[id]/read
 * Marks a notification as read if it belongs to the authenticated session user.
 */
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    // Role re-check
    if (!["student", "admin"].includes(user.role)) {
      return failure("Access denied: Invalid user role", 403);
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid notification ID format", 400);
    }

    const updated = await markRead(user.id, id);
    if (!updated) {
      // 404 when notification does not exist or does not belong to user
      return failure("Notification not found", 404);
    }

    return success(updated, "Notification marked as read.");
  } catch (err) {
    console.error("[POST /api/notifications/[id]/read Error]:", err);
    return failure("Failed to mark notification as read.", 500);
  }
}
