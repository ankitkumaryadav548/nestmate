import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/User";

export const TOKEN_COOKIE_NAME = "hm_token";

/**
 * Returns the encoded secret key for Jose JWT signing and verification.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "hostelmatch_default_secret_key_minimum_32_characters_long";
  return new TextEncoder().encode(secret);
}

/**
 * Parses duration string (e.g., "7d", "24h") into seconds.
 */
function parseExpirySeconds(expiryStr = "7d") {
  if (typeof expiryStr === "number") return expiryStr;
  const match = expiryStr.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60; // default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60;
    case "h":
      return value * 60 * 60;
    case "m":
      return value * 60;
    case "s":
      return value;
    default:
      return 7 * 24 * 60 * 60;
  }
}

/**
 * Returns cookie configuration options for hm_token.
 */
export function getCookieOptions() {
  const maxAge = parseExpirySeconds(process.env.JWT_EXPIRES_IN || "7d");
  return {
    name: TOKEN_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

/**
 * Signs a JWT with the user payload using Jose.
 * 
 * @param {object} payload - Claims to embed in the JWT (e.g. userId, email, role)
 * @returns {Promise<string>}
 */
export async function signToken(payload) {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verifies and decodes a JWT using Jose.
 * 
 * @param {string} token 
 * @returns {Promise<object|null>} Decoded payload or null if invalid/expired
 */
export async function verifyToken(token) {
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Retrieves the currently authenticated user from request cookie or Next.js headers cookies.
 * 
 * @param {Request} [request] - Optional Next.js Request object
 * @returns {Promise<object|null>} User document or null if unauthenticated/inactive
 */
export async function getCurrentUser(request) {
  let token = null;

  // Extract from Request if provided
  if (request) {
    if (typeof request.cookies?.get === "function") {
      token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
    } else if (request.headers) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE_NAME}=([^;]+)`));
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }

  // Fallback to Next.js cookies() from next/headers
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    } catch {
      // cookies() might fail if called outside request scope
    }
  }

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    return null;
  }

  try {
    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  } catch (err) {
    console.error("[getCurrentUser Error]", err.message);
    return null;
  }
}
