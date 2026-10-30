import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const TOKEN_COOKIE_NAME = "hm_token";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "hostelmatch_default_secret_key_minimum_32_characters_long";
  return new TextEncoder().encode(secret);
}

/**
 * Route protection proxy (Next.js 16+ convention replacing middleware.js).
 * Protects /dashboard and /admin routes and handles role-based redirects.
 */
export default async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;

  let payload = null;
  if (token) {
    try {
      const secret = getJwtSecret();
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch {
      payload = null;
    }
  }

  const isAuthenticated = Boolean(payload && payload.userId);
  const role = payload?.role;

  // 1. Unauthenticated users trying to access protected paths
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Non-admin users trying to access /admin
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // 3. Authenticated users trying to access public auth pages (/login or /register)
  if (pathname === "/login" || pathname === "/register") {
    if (isAuthenticated) {
      const target = role === "admin" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  // 4. Root path ('/') redirect: send directly to login portal or dashboard
  if (pathname === "/") {
    if (isAuthenticated) {
      const target = role === "admin" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
