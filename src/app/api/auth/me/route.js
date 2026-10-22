import { getCurrentUser } from "@/lib/auth";
import { success, failure } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return failure("Unauthorized: No active session", 401);
    }

    return success(user.toObject(), "Session active", 200);
  } catch (err) {
    console.error("[Me Endpoint Error]", err);
    return failure("Failed to retrieve current user session", 500);
  }
}
