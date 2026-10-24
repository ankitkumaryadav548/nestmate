import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getEditCandidates } from "@/services/allocationEditService";

/**
 * GET /api/admin/allocations/[id]/edit-options?unitId=...&mode=move|swap_rooms|swap_members
 * Retrieves candidate options (rooms or partner units) for administrative editing.
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
    const unitId = searchParams.get("unitId");
    const mode = searchParams.get("mode");

    if (!unitId) {
      return failure("Query parameter 'unitId' is required", 400);
    }

    if (!["move", "swap_rooms", "swap_members", "assign_waitlisted"].includes(mode)) {
      return failure("Query parameter 'mode' must be one of: move, swap_rooms, swap_members, assign_waitlisted", 400);
    }

    const options = await getEditCandidates(id, unitId, mode);
    return success(options, "Edit candidate options retrieved successfully");
  } catch (error) {
    console.error("[Get Edit Options Error]:", error);
    return failure(error.message || "Failed to retrieve edit options", error.status || 500);
  }
}
