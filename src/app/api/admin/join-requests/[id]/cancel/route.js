import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import GroupJoinRequest from "@/models/GroupJoinRequest";
import { notify } from "@/services/notificationService";

/**
 * POST /api/admin/join-requests/[id]/cancel
 * Cancels a pending join request administratively.
 */
export async function POST(request, { params }) {
  try {
    const { user: adminUser, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid join request ID", 400);
    }

    await connectDB();
    const reqDoc = await GroupJoinRequest.findById(id).populate("group", "leader");
    if (!reqDoc) {
      return failure("Join request not found", 404);
    }

    if (reqDoc.status !== "pending") {
      return failure("Only pending join requests can be cancelled", 400);
    }

    reqDoc.status = "cancelled";
    reqDoc.closeReason = "cancelled_by_admin";
    reqDoc.respondedAt = new Date();
    reqDoc.respondedBy = adminUser.id;
    await reqDoc.save();

    // Notify requester
    await notify(
      reqDoc.requester.toString(),
      "join_request_closed",
      {
        reason: "the request was cancelled by an administrator",
      },
      {
        dedupeParts: [reqDoc._id.toString(), "admin_cancelled"],
        data: {
          requestId: reqDoc._id.toString(),
          groupId: reqDoc.group?._id?.toString() || "",
        },
      }
    ).catch(() => {});

    return success(
      { id: reqDoc._id.toString(), status: "cancelled", closeReason: "cancelled_by_admin" },
      "Join request cancelled successfully"
    );
  } catch (error) {
    console.error("[Admin Cancel Join Request Error]:", error);
    return failure(error.message || "Failed to cancel join request", 500);
  }
}

