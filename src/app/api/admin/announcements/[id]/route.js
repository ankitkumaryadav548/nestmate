import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getAnnouncement, withdrawAnnouncement } from "@/services/notificationService";

/**
 * GET /api/admin/announcements/[id]
 * Retrieves details and read metrics for an announcement.
 */
export async function GET(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    if (user.role !== "admin") {
      return failure("Forbidden: Administrator access required", 403);
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid announcement ID format", 400);
    }

    const item = await getAnnouncement(id);
    if (!item) {
      return failure("Announcement not found", 404);
    }

    return success(item, "Announcement retrieved successfully.");
  } catch (err) {
    console.error("[GET /api/admin/announcements/[id] Error]:", err);
    return failure("Failed to retrieve announcement details.", 500);
  }
}

/**
 * DELETE /api/admin/announcements/[id]
 * Withdraws an active announcement and purges delivered notifications.
 */
export async function DELETE(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    if (user.role !== "admin") {
      return failure("Forbidden: Administrator access required", 403);
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid announcement ID format", 400);
    }

    const withdrawn = await withdrawAnnouncement(user.id, id);
    return success(withdrawn, "Announcement withdrawn and delivered copies purged.");
  } catch (err) {
    console.error("[DELETE /api/admin/announcements/[id] Error]:", err);
    return failure(err.message || "Failed to withdraw announcement.", 400);
  }
}
