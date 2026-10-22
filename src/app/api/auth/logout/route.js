import { success, failure } from "@/lib/apiResponse";
import { TOKEN_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const response = success(null, "Logged out successfully", 200);

    // Clear the httpOnly cookie by setting an expired date and 0 maxAge
    response.cookies.set(TOKEN_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (err) {
    console.error("[Logout Error]", err);
    return failure("Failed to log out", 500);
  }
}
