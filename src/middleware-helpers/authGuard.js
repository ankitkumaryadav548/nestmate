import { getCurrentUser } from "@/lib/auth";
import { failure } from "@/lib/apiResponse";

/**
 * Route Handler guard ensuring user is logged in.
 * 
 * Usage in API route:
 *   const { user, errorResponse } = await requireAuth(req);
 *   if (errorResponse) return errorResponse;
 * 
 * @param {Request} [request] 
 * @returns {Promise<{ user: object|null, errorResponse: Response|null }>}
 */
export async function requireAuth(request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return {
      user: null,
      errorResponse: failure("Authentication required. Please log in.", 401),
    };
  }

  return { user, errorResponse: null };
}

/**
 * Route Handler guard ensuring user is logged in and possesses one of the allowed roles.
 * 
 * Usage in API route:
 *   const { user, errorResponse } = await requireRole("admin", req);
 *   // OR: await requireRole(["admin", "warden"], req);
 *   if (errorResponse) return errorResponse;
 * 
 * @param {string|string[]} roles 
 * @param {Request} [request] 
 * @returns {Promise<{ user: object|null, errorResponse: Response|null }>}
 */
export async function requireRole(roles, request) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) {
    return { user: null, errorResponse };
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  if (!allowedRoles.includes(user.role)) {
    return {
      user,
      errorResponse: failure(
        `Forbidden: Access restricted to [${allowedRoles.join(", ")}]`,
        403
      ),
    };
  }

  return { user, errorResponse: null };
}
