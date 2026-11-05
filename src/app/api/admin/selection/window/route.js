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

const coerceToDate = (requiredMsg) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    return val;
  }, z.coerce.date({
    required_error: requiredMsg,
    invalid_type_error: requiredMsg,
  }));

const createWindowSchema = z
  .object({
    name: z.string().optional(),
    startsAt: coerceToDate("Start date is required"),
    endsAt: coerceToDate("End date is required"),
  })
  .superRefine((data, ctx) => {
    const now = Date.now();
    if (data.endsAt && data.endsAt.getTime() <= now) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End must be in the future",
        path: ["endsAt"],
      });
    }
    if (
      data.startsAt &&
      data.endsAt &&
      data.endsAt.getTime() - data.startsAt.getTime() < 5 * 60 * 1000
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End must be at least 5 minutes after start",
        path: ["endsAt"],
      });
    }
  });

const patchWindowSchema = z.object({
  action: z.enum(["open-now", "close-now", "extend", "edit"]),
  minutes: z.coerce.number().optional(),
  startsAt: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.date().optional()
  ),
  endsAt: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.date().optional()
  ),
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

    const window = await createWindow(user.id, parseRes.data);
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
      case "extend": {
        const param = minutes || endsAt;
        if (!param) {
          return failure("Valid minutes or end date is required to extend window", 400);
        }
        result = await extendWindow(user.id, param);
        break;
      }
      case "edit":
        if (!startsAt) {
          return failure("Start date is required", 400);
        }
        if (!endsAt) {
          return failure("End date is required", 400);
        }
        if (new Date(endsAt).getTime() <= Date.now()) {
          return failure("End must be in the future", 400);
        }
        if (new Date(endsAt).getTime() - new Date(startsAt).getTime() < 5 * 60 * 1000) {
          return failure("End must be at least 5 minutes after start", 400);
        }
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
