import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { finalizeSelection } from "@/services/selectionFinalizeService";
import { FINALIZE_CONFIRM_TEXT } from "@/config/selection";

const finalizeSchema = z.object({
  confirmText: z.string().refine((val) => val === FINALIZE_CONFIRM_TEXT, {
    message: `Confirmation text must be exactly "${FINALIZE_CONFIRM_TEXT}"`,
  }),
});

/**
 * POST /api/admin/selection/finalize
 * Finalizes selection window: locks groups with selected rooms and auto-fills remaining seats.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const parseRes = finalizeSchema.safeParse(body);
    if (!parseRes.success) {
      return failure(parseRes.error.errors[0]?.message || "Invalid finalize confirmation", 400);
    }

    const result = await finalizeSelection(user.id);
    return success(result, "Selection window finalized successfully", 200);
  } catch (error) {
    console.error("[Finalize Selection Error]:", error);
    return failure(
      error.message || "Failed to finalize selection",
      error.statusCode || 500,
      { code: error.code }
    );
  }
}

