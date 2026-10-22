import { z } from "zod";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signToken, getCookieOptions } from "@/lib/auth";
import { success, failure } from "@/lib/apiResponse";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const registerSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters long")
      .max(100, "Name cannot exceed 100 characters"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address"),
    password: z
      .string({ required_error: "Password is required" })
      .min(8, "Password must be at least 8 characters long"),
    confirmPassword: z
      .string({ required_error: "Confirm password is required" }),
    gender: z.enum(["male", "female", "other"], {
      errorMap: () => ({ message: "Please select a valid gender (male, female, or other)" }),
    }),
    registrationNumber: z
      .string({ required_error: "Registration number is required" })
      .trim()
      .min(2, "Registration number must be at least 2 characters"),
    phone: z.string().trim().optional().default(""),
    course: z.string().trim().optional().default(""),
    department: z.string().trim().optional().default(""),
    year: z
      .preprocess(
        (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
        z.number().int().min(1, "Year must be between 1 and 6").max(6, "Year must be between 1 and 6").nullable().optional()
      )
      .default(null),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request) {
  try {
    // In-memory rate limiting check (10 attempts per 15 minutes per IP)
    const ip = getClientIp(request);
    const limiter = rateLimit(`register_${ip}`, 10, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return failure(
        "Too many registration attempts. Please try again in a few minutes.",
        429
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return failure("Invalid JSON payload", 400);
    }

    // Validate request schema with Zod
    const validation = registerSchema.safeParse(body);
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

    const {
      name,
      email,
      password,
      gender,
      registrationNumber,
      phone,
      course,
      department,
      year,
    } = validation.data;

    await connectDB();

    // Check duplicate email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return failure(
        "An account with this email address already exists.",
        409,
        { email: "Email is already registered" }
      );
    }

    // Check duplicate registration number
    const existingReg = await User.findOne({ registrationNumber });
    if (existingReg) {
      return failure(
        "A student with this registration number already exists.",
        409,
        { registrationNumber: "Registration number is already registered" }
      );
    }

    // Hash password securely with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // SECURITY: Public registration is strictly locked to role: "student"
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student", // NEVER accept role from request body
      gender,
      registrationNumber,
      phone,
      course,
      department,
      year,
      isActive: true,
    });

    // Create Jose JWT token
    const token = await signToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    });

    const safeUser = newUser.toObject();

    // Set secure httpOnly cookie on response
    const cookieOptions = getCookieOptions();
    const response = success(safeUser, "Registration successful", 201);
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (err) {
    console.error("[Register Error]", err);
    return failure("An error occurred during registration. Please try again.", 500);
  }
}
