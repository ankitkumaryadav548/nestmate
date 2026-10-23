import mongoose from "mongoose";
import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { getPairResult } from "@/services/matchingService";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * GET /api/matches/with/[userId]
 * 
 * Retrieves detailed compatibility between the authenticated student and a specific peer.
 * Returns 404 "Not available" if peer is invalid, not in candidate pool, or excluded by deal-breakers.
 */
export async function GET(request, { params }) {
  try {
    const { user, errorResponse } = await requireRole("student", request);
    if (errorResponse) return errorResponse;

    const { userId } = await params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return failure("Not available", 404);
    }

    if (userId === user.id) {
      return failure("Cannot match with yourself", 400);
    }

    // Rate limiting: 60 requests per minute
    const ip = getClientIp(request);
    const limiter = rateLimit(`matches_with_${user.id || ip}`, 60, 60 * 1000);
    if (!limiter.allowed) {
      return failure("Too many requests. Please slow down.", 429);
    }

    const result = await getPairResult(user.id, userId, { forAdmin: false });

    if (!result.eligible) {
      return failure("Not available", 404);
    }

    return success(result.candidate, "Match details retrieved successfully");
  } catch (error) {
    console.error("[Matches With User API Error]:", error);
    return failure("Not available", 404);
  }
}
