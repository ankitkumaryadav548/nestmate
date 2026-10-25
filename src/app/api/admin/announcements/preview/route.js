import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import Hostel from "@/models/Hostel";
import connectDB from "@/lib/db";
import { resolveAudience } from "@/services/notificationService";
import { validateAudience, describeAudience } from "@/services/notifications/audience";

/**
 * POST /api/admin/announcements/preview
 * Calculates recipient count and audience summary label without dispatching notifications.
 * 
 * Body:
 * {
 *   audience: { type: "gender", gender: "female", ... }
 * }
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    if (user.role !== "admin") {
      return failure("Forbidden: Administrator access required", 403);
    }

    const body = await request.json();
    if (!body || !body.audience) {
      return failure("Audience configuration object is required", 400);
    }

    await connectDB();
    const normalized = validateAudience(body.audience);
    const userIds = await resolveAudience(normalized);

    const lookups = {};
    if (normalized.type === "hostel") {
      const hostel = await Hostel.findById(normalized.hostelId).select("name").lean();
      if (hostel) lookups.hostelName = hostel.name;
    }

    const audienceLabel = describeAudience(normalized, lookups);

    return success(
      {
        count: userIds.length,
        audienceLabel,
        audience: normalized,
      },
      "Audience preview calculated successfully."
    );
  } catch (err) {
    console.error("[POST /api/admin/announcements/preview Error]:", err);
    return failure(err.message || "Failed to calculate audience preview.", 400);
  }
}
