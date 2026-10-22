import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { requireAuth, requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import {
  getHostelByIdWithStats,
  updateHostel,
  deleteHostel,
} from "@/services/hostelService";
import { z } from "zod";

const updateHostelSchema = z.object({
  name: z.string().trim().min(2, "Hostel name must be at least 2 characters").max(100).optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .transform((val) => val.toUpperCase())
    .optional(),
  gender: z.enum(["boys", "girls", "mixed"]).optional(),
  location: z.string().trim().optional(),
  totalFloors: z.coerce.number().int().min(1).optional(),
  allowedYears: z.array(z.number().int().min(1).max(6)).optional(),
  facilities: z.array(z.string().trim()).optional(),
  rules: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/hostels/[id]
 * Retrieves hostel details with stats for admin or eligible student.
 */
export async function GET(request, { params }) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid hostel ID format", 400);
    }

    await connectDB();

    const hostel = await getHostelByIdWithStats(id, user);
    if (!hostel) {
      return failure("Hostel not found or you are not eligible to view it", 404);
    }

    return success(hostel, "Hostel details retrieved successfully");
  } catch (error) {
    console.error("[API_HOSTEL_GET_ID_ERROR]:", error);
    return failure(error.message || "Failed to retrieve hostel", 500);
  }
}

/**
 * PUT /api/hostels/[id]
 * Admin only: updates hostel attributes.
 */
export async function PUT(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid hostel ID format", 400);
    }

    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch {
      return failure("Invalid JSON payload", 400);
    }

    const validation = updateHostelSchema.safeParse(body);
    if (!validation.success) {
      return failure("Validation failed", 400, validation.error.format());
    }

    const updated = await updateHostel(id, validation.data);
    return success(updated, "Hostel updated successfully");
  } catch (error) {
    console.error("[API_HOSTEL_PUT_ERROR]:", error);
    return failure(error.message || "Failed to update hostel", 400);
  }
}

/**
 * DELETE /api/hostels/[id]
 * Admin only: deletes hostel and its rooms if occupancy is 0.
 */
export async function DELETE(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid hostel ID format", 400);
    }

    await connectDB();

    const result = await deleteHostel(id);
    return success(result, "Hostel and associated rooms deleted successfully");
  } catch (error) {
    console.error("[API_HOSTEL_DELETE_ERROR]:", error);
    return failure(error.message || "Failed to delete hostel", 400);
  }
}
