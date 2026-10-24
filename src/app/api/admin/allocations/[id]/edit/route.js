import mongoose from "mongoose";
import { z } from "zod";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { EDIT_ACTIONS } from "@/config/allocation";
import {
  moveUnit,
  swapRooms,
  swapMembers,
  unassignUnit,
  assignWaitlisted,
} from "@/services/allocationEditService";

const editSchema = z.object({
  action: z.enum(EDIT_ACTIONS),
  params: z.object({
    unitId: z.string().optional(),
    targetRoomId: z.string().optional(),
    unitIdA: z.string().optional(),
    unitIdB: z.string().optional(),
    memberIdA: z.string().optional(),
    memberIdB: z.string().optional(),
  }).default({}),
  confirmOverride: z.boolean().optional().default(false),
  overrideReason: z.string().optional().nullable(),
});

/**
 * POST /api/admin/allocations/[id]/edit
 * Executes an administrative modification to a draft allocation run.
 * 
 * Access: Administrator only.
 */
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const ip = getClientIp(request);
    const limit = rateLimit(`edit_allocation_${ip}`, 60, 60 * 1000); // 60 edits / min
    if (!limit.allowed) {
      return failure("Rate limit exceeded for allocation edits. Please wait a moment.", 429);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid allocation run ID", 400);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = editSchema.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || "Invalid edit request body";
      return failure(msg, 400);
    }

    const { action, params: p, confirmOverride, overrideReason } = parsed.data;

    const adminId = user._id || user.id || user.userId;
    let result;
    if (action === "move") {
      if (!p.unitId || !p.targetRoomId) {
        return failure("unitId and targetRoomId are required for move action", 400);
      }
      result = await moveUnit(adminId, id, {
        unitId: p.unitId,
        targetRoomId: p.targetRoomId,
      });
    } else if (action === "swap_rooms") {
      if (!p.unitIdA || !p.unitIdB) {
        return failure("unitIdA and unitIdB are required for swap_rooms action", 400);
      }
      result = await swapRooms(adminId, id, {
        unitIdA: p.unitIdA,
        unitIdB: p.unitIdB,
      });
    } else if (action === "swap_members") {
      if (!p.unitIdA || !p.memberIdA || !p.unitIdB || !p.memberIdB) {
        return failure("unitIdA, memberIdA, unitIdB, and memberIdB are required for swap_members action", 400);
      }
      result = await swapMembers(adminId, id, {
        unitIdA: p.unitIdA,
        memberIdA: p.memberIdA,
        unitIdB: p.unitIdB,
        memberIdB: p.memberIdB,
        confirmOverride,
        overrideReason,
      });

      if (result.requiresOverride) {
        return failure(result.message || "Deal-breaker conflict requires admin override", 409, {
          requiresOverride: true,
          conflictingPairs: result.conflictingPairs,
        });
      }
    } else if (action === "unassign") {
      if (!p.unitId) {
        return failure("unitId is required for unassign action", 400);
      }
      result = await unassignUnit(adminId, id, { unitId: p.unitId });
    } else if (action === "assign_waitlisted") {
      if (!p.unitId || !p.targetRoomId) {
        return failure("unitId and targetRoomId are required for assign_waitlisted action", 400);
      }
      result = await assignWaitlisted(adminId, id, {
        unitId: p.unitId,
        targetRoomId: p.targetRoomId,
      });
    }

    return success(result, result.message || "Edit applied successfully");
  } catch (error) {
    console.error("[Edit Allocation Run Error]:", error);
    return failure(error.message || "Failed to edit allocation run", error.status || 500);
  }
}
