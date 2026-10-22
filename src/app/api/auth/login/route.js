import { z } from "zod";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signToken, getCookieOptions } from "@/lib/auth";
import { success, failure } from "@/lib/apiResponse";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
  role: z.enum(["student", "admin"]).optional(),
});

export async function POST(request) {
  try {
    // In-memory rate limiting check (10 attempts per 15 minutes per IP)
    const ip = getClientIp(request);
    const limiter = rateLimit(`login_${ip}`, 10, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return failure(
        "Too many login attempts. Please wait 15 minutes before trying again.",
        429
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return failure("Invalid JSON payload", 400);
    }

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach((err) => {
        const fieldName = err.path.join(".") || "general";
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = err.message;
        }
      });
      return failure("Validation failed", 400, fieldErrors);
    }

    const { email, password, role } = validation.data;

    await connectDB();

    // Query user by email and explicitly select password (which has select: false)
    const user = await User.findOne({ email }).select("+password");

    // Account enumeration protection: use generic error for wrong email or password
    if (!user) {
      return failure("Invalid email or password", 401);
    }

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return failure("Invalid email or password", 401);
    }

    // Check account active state
    if (!user.isActive) {
      return failure(
        "Your account is inactive. Please contact your hostel administrator.",
        403
      );
    }

    // Role preference validation if specified by client
    if (role && user.role !== role) {
      const selectedLabel = role === "admin" ? "Administrator" : "Student";
      const actualLabel = user.role === "admin" ? "Administrator" : "Student";
      return failure(
        `Role mismatch: You selected "${selectedLabel}" login, but this account is registered as a "${actualLabel}". Please switch tabs to log in.`,
        403
      );
    }

    // Sign JWT token
    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const safeUser = user.toObject();

    // Set secure httpOnly cookie
    const cookieOptions = getCookieOptions();
    const response = success(safeUser, "Login successful", 200);
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (err) {
    console.error("[Login Error]", err);
    return failure("An error occurred during login. Please try again.", 500);
  }
}
