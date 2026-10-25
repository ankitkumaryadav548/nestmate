import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";
import { TITLE_MAX, MESSAGE_MAX } from "@/config/notifications";
import { listAnnouncements, sendAnnouncement } from "@/services/notificationService";

const createAnnouncementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(TITLE_MAX, `Title cannot exceed ${TITLE_MAX} characters`),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(MESSAGE_MAX, `Message cannot exceed ${MESSAGE_MAX} characters`),
  link: z.string().trim().nullable().optional(),
  audience: z.object({
    type: z.string(),
    gender: z.string().optional(),
    year: z.union([z.number(), z.string()]).optional(),
    hostelId: z.string().optional(),
    status: z.string().optional(),
  }),
});

/**
 * GET /api/admin/announcements
 * Lists historical announcements with recipient counts and read rates.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    // Strict role check
    if (user.role !== "admin") {
      return failure("Forbidden: Administrator access required", 403);
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 20;

    const data = await listAnnouncements({ page, limit });
    return success(data, "Announcements history retrieved successfully.");
  } catch (err) {
    console.error("[GET /api/admin/announcements Error]:", err);
    return failure("Failed to retrieve announcements history.", 500);
  }
}

/**
 * POST /api/admin/announcements
 * Dispatches an administrative announcement to a targeted cohort.
 * Rate limited to 10 broadcasts per hour per administrator.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    // Strict role check
    if (user.role !== "admin") {
      return failure("Forbidden: Administrator access required", 403);
    }

    // Rate limiting: 10 per hour per admin
    const rlKey = `admin_announcements_${user.id}`;
    const rl = rateLimit(rlKey, 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      return failure(
        "Rate limit exceeded: Administrators may send at most 10 announcements per hour.",
        429,
        { resetTime: rl.resetTime }
      );
    }

    const body = await request.json();
    const parsed = createAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return failure(
        "Invalid announcement payload",
        400,
        parsed.error.flatten().fieldErrors
      );
    }

    const { title, message, link, audience } = parsed.data;

    const announcement = await sendAnnouncement(user.id, {
      title,
      message,
      link,
      audience,
    });

    return success(announcement, "Announcement dispatched successfully.", 201);
  } catch (err) {
    console.error("[POST /api/admin/announcements Error]:", err);
    return failure(err.message || "Failed to dispatch announcement.", 400);
  }
}
