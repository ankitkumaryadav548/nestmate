import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import {
  createWindow,
  openNow,
  closeNow,
  extendWindow,
  editWindow,
} from "@/services/selectionWindowService";

const createWindowSchema = z.object({
  name: z.string().optional(),
  startsAt: z.string().or(z.date()),
  endsAt: z.string().or(z.date()),
});

const patchWindowSchema = z.object({
  action: z.enum(["open-now", "close-now", "extend", "edit"]),
  minutes: z.number().optional(),
  startsAt: z.string().or(z.date()).optional(),
  endsAt: z.string().or(z.date()).optional(),
  name: z.string().optional(),
});

/**
 * POST /api/admin/selection/window
 * Creates or schedules a new selection window.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const parseRes = createWindowSchema.safeParse(body);
    if (!parseRes.success) {
      return failure(parseRes.error.errors[0]?.message || "Invalid window creation payload", 400);
    }

    const window = await createWindow(parseRes.data, user.id);
    return success(window, "Selection window created successfully", 201);
  } catch (error) {
    console.error("[Create Window Error]:", error);
    return failure(
      error.message || "Failed to create selection window",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

/**
 * PATCH /api/admin/selection/window
 * Actions: open-now, close-now, extend, edit
 */
export async function PATCH(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const parseRes = patchWindowSchema.safeParse(body);
    if (!parseRes.success) {
      return failure(parseRes.error.errors[0]?.message || "Invalid window update payload", 400);
    }

    const { action, minutes, startsAt, endsAt, name } = parseRes.data;
    let result = null;

    switch (action) {
      case "open-now":
        result = await openNow(user.id, minutes || 60);
        break;
      case "close-now":
        result = await closeNow(user.id);
        break;
      case "extend":
        if (!minutes || minutes <= 0) {
          return failure("Valid minutes parameter is required to extend window", 400);
        }
        result = await extendWindow(user.id, minutes);
        break;
      case "edit":
        result = await editWindow(user.id, { startsAt, endsAt, name });
        break;
      default:
        return failure("Unknown window action", 400);
    }

    return success(result, `Window action "${action}" completed successfully`, 200);
  } catch (error) {
    console.error("[Window Action Error]:", error);
    return failure(
      error.message || "Failed to perform window action",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

