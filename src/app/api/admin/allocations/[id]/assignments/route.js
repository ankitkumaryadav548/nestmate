import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { listAssignments } from "@/services/allocationService";

/**
 * GET /api/admin/allocations/[id]/assignments
 * Retrieves paginated assignments for an allocation run, with optional status/hostel filtering and search.
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const hostelId = searchParams.get("hostelId") || "all";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await listAssignments(id, {
      status,
      hostelId,
      search,
      page,
      limit,
    });

    return success(result, "Assignments retrieved successfully");
  } catch (error) {
    console.error("[List Run Assignments Error]:", error);
    return failure(error.message || "Failed to retrieve assignments", error.status || 500);
  }
}
