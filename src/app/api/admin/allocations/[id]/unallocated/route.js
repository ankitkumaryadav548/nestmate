import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { listUnallocated } from "@/services/allocationService";

/**
 * GET /api/admin/allocations/[id]/unallocated
 * Retrieves the roster of students unallocated during this run, along with reasons.
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

    const unallocated = await listUnallocated(id);
    return success(unallocated, "Unallocated students retrieved successfully");
  } catch (error) {
    console.error("[List Run Unallocated Error]:", error);
    return failure(error.message || "Failed to retrieve unallocated students", error.status || 500);
  }
}
