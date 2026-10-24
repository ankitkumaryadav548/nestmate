import { z } from "zod";
import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import StudentProfile from "@/models/StudentProfile";

const sharingSchema = z.object({
  sharePhoneWithRoommates: z.boolean({
    required_error: "sharePhoneWithRoommates boolean flag is required",
  }),
});

/**
 * PATCH /api/students/me/profile/sharing
 * Updates student's phone sharing privacy preference with future roommates.
 * 
 * Access: Authenticated students only.
 */
export async function PATCH(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const rawBody = await request.json().catch(() => ({}));
    const parsed = sharingSchema.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || "Invalid sharing payload";
      return failure(msg, 400);
    }

    await connectDB();

    const studentId = user._id || user.id || user.userId;
    const profile = await StudentProfile.findOneAndUpdate(
      { user: studentId },
      { $set: { sharePhoneWithRoommates: parsed.data.sharePhoneWithRoommates } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return success(
      { sharePhoneWithRoommates: profile.sharePhoneWithRoommates },
      "Phone sharing preference updated successfully"
    );
  } catch (error) {
    console.error("[Update Sharing Preference Error]:", error);
    return failure(error.message || "Failed to update sharing preference", error.status || 500);
  }
}
