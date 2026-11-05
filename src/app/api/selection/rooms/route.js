import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { listSelectableRooms } from "@/services/roomSelectionService";
import { getCurrentWindow } from "@/services/selectionWindowService";

/**
 * GET /api/selection/rooms
 * Lists free rooms compatible with the student/group's gender and size.
 * Anonymized: never exposes occupants or student data.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    // Lazily evaluate window state & trigger notification if scheduled start time arrived
    await getCurrentWindow();

    const { searchParams } = new URL(request.url);
    const hostelId = searchParams.get("hostelId") || undefined;
    const roomType = searchParams.get("roomType") || undefined;
    const floor = searchParams.get("floor") ? parseInt(searchParams.get("floor"), 10) : undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page"), 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit"), 10) : 20;

    const result = await listSelectableRooms(user.id, {
      hostelId,
      roomType,
      floor,
      page,
      limit,
    });

    return success(result, "Selectable rooms retrieved successfully");
  } catch (error) {
    console.error("[List Selectable Rooms Error]:", error);
    return failure(
      error.message || "Failed to list selectable rooms",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

