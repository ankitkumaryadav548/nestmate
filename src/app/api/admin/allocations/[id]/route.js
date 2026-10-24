import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getRun, deleteDraftRun } from "@/services/allocationService";

/**
 * GET /api/admin/allocations/[id]
 * Retrieves details, configuration, and compiled statistics for a specific allocation run.
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

    const run = await getRun(id);
    return success(run, "Allocation run details retrieved successfully");
  } catch (error) {
    console.error("[Get Allocation Run Error]:", error);
    return failure(error.message || "Failed to retrieve allocation run", error.status || 500);
  }
}

/**
 * DELETE /api/admin/allocations/[id]
 * Permanently removes an allocation run and its assignment records (draft or failed only).
 * 
 * Access: Administrator only.
 */
export async function DELETE(request, { params }) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid allocation run ID", 400);
    }

    const result = await deleteDraftRun(id);
    return success(result, "Allocation run and its assignments deleted successfully");
  } catch (error) {
    console.error("[Delete Allocation Run Error]:", error);
    return failure(error.message || "Failed to delete allocation run", error.status || 500);
  }
}
