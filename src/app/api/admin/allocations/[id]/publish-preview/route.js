import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { previewPublish } from "@/services/publishService";

/**
 * GET /api/admin/allocations/[id]/publish-preview
 * Previews publication validation and summary counts without modifying live data.
 * 
 * Access: Administrator only.
 */
export async function GET(request, { params }) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid allocation run ID", 400);
    }

    const preview = await previewPublish(id);
    return success(preview, "Publication preview evaluated successfully");
  } catch (error) {
    console.error("[Publish Preview Error]:", error);
    return failure(error.message || "Failed to evaluate publication preview", error.status || 500);
  }
}
