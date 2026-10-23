import mongoose from "mongoose";
import { z } from "zod";
import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getStudentById, toggleStudentActive } from "@/services/studentService";

const patchStudentSchema = z
  .object({
    isActive: z.boolean({
      required_error: "isActive boolean flag is required",
      invalid_type_error: "isActive must be a boolean",
    }),
  })
  .strict(); // STRICT: Reject any extra fields such as role, password, email

/**
 * GET /api/admin/students/[id]
 * Admin only: retrieves a single student's complete record including Profile and Preferences.
 */
export async function GET(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid student ID format", 400);
    }

    await connectDB();
    const studentData = await getStudentById(id);
    if (!studentData) {
      return failure("Student not found", 404);
    }

    return success(studentData, "Student details retrieved successfully");
  } catch (error) {
    console.error("[API_ADMIN_STUDENT_GET_ID_ERROR]:", error);
    return failure(error.message || "Failed to retrieve student details", 500);
  }
}

/**
 * PATCH /api/admin/students/[id]
 * Admin only: strictly toggles student account active status.
 * Explicitly rejects and prevents any changes to role, password, or academic identity.
 */
export async function PATCH(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid student ID format", 400);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return failure("Invalid JSON payload", 400);
    }

    const validation = patchStudentSchema.safeParse(body);
    if (!validation.success) {
      return failure(
        "Validation failed: only 'isActive' boolean can be toggled.",
        400,
        validation.error.issues
      );
    }

    await connectDB();
    const updated = await toggleStudentActive(id, validation.data.isActive);

    return success(
      updated,
      `Student account ${updated.isActive ? "activated" : "deactivated"} successfully`
    );
  } catch (error) {
    console.error("[API_ADMIN_STUDENT_PATCH_ERROR]:", error);
    return failure(error.message || "Failed to update student status", 400);
  }
}
