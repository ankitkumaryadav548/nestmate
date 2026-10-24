import { requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import { checkIntegrity } from "@/services/integrityService";

/**
 * GET /api/admin/integrity
 * Runs a system diagnostic check across rooms, allocations, groups, and publication runs.
 * 
 * Access: Administrator only.
 */
export async function GET(request) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const report = await checkIntegrity();
    return success(report, report.isClean ? "System integrity is verified clean" : "Integrity discrepancies detected");
  } catch (error) {
    console.error("[Check Integrity Error]:", error);
    return failure(error.message || "Failed to execute integrity check", error.status || 500);
  }
}
