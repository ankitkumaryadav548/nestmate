import mongoose from "mongoose";
import { requireAuth } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { deleteMine } from "@/services/notificationService";

/**
 * DELETE /api/notifications/[id]
 * Deletes a single notification belonging to the authenticated session user.
 */
export async function DELETE(request, { params }) {
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

    const ok = await deleteMine(user.id, id);
    if (!ok) {
      // 404 when notification does not exist or does not belong to user
      return failure("Notification not found", 404);
    }

    return success({ deleted: true }, "Notification deleted successfully.");
  } catch (err) {
    console.error("[DELETE /api/notifications/[id] Error]:", err);
    return failure("Failed to delete notification.", 500);
  }
}
