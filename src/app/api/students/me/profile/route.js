import { z } from "zod";
import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getProfile, upsertProfile } from "@/services/studentService";

const profileSchema = z.object({
  course: z.string().trim().max(100).optional().default(""),
  department: z.string().trim().max(100).optional().default(""),
  year: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().int().min(1, "Academic year must be between 1 and 6").max(6, "Academic year must be between 1 and 6").nullable().optional()
    )
    .default(null),
  phone: z.string().trim().max(25).optional().default(""),
  homeState: z.string().trim().max(100).optional().default(""),
  homeCountry: z.string().trim().max(100).optional().default("India"),
  isInternational: z.boolean().optional().default(false),
  homeTimeZone: z.string().trim().max(50).optional().default("Asia/Kolkata"),
  arrivalDate: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : new Date(val)),
      z.date().nullable().optional()
    )
    .default(null),
  emergencyContactName: z.string().trim().max(100).optional().default(""),
  emergencyContactPhone: z.string().trim().max(25).optional().default(""),
  sharePhoneWithRoommates: z.boolean().optional(),
});

/**
 * GET /api/students/me/profile
 * Retrieves the current student's personal profile and academic details.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    await connectDB();
    const data = await getProfile(user._id);

    return success(data, "Student profile retrieved successfully");
  } catch (error) {
    console.error("[API_STUDENT_GET_PROFILE_ERROR]:", error);
    return failure(error.message || "Failed to retrieve student profile", 500);
  }
}

/**
 * PUT /api/students/me/profile
 * Updates the current student's profile and marks profileCompletedAt when required fields are present.
 */
export async function PUT(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => null);
    if (!body) {
      return failure("Invalid JSON payload", 400);
    }

    const validation = profileSchema.safeParse(body);
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.issues.forEach((err) => {
        const field = err.path.join(".") || "general";
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      return failure("Profile validation failed", 400, fieldErrors);
    }

    await connectDB();
    const updated = await upsertProfile(user._id, validation.data);

    return success(updated, "Profile updated successfully");
  } catch (error) {
    console.error("[API_STUDENT_PUT_PROFILE_ERROR]:", error);
    return failure(error.message || "Failed to update profile", 500);
  }
}
