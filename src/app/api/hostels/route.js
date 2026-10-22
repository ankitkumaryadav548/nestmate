import connectDB from "@/lib/db";
import { requireAuth, requireRole } from "@/middleware-helpers/authGuard";
import { success, failure } from "@/lib/apiResponse";
import Hostel from "@/models/Hostel";
import { getHostelsWithStats } from "@/services/hostelService";
import { z } from "zod";

const hostelQuerySchema = z.object({
  gender: z.enum(["boys", "girls", "mixed"]).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "code", "gender", "totalFloors", "createdAt"]).default("code"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

const createHostelSchema = z.object({
  name: z.string().trim().min(2, "Hostel name must be at least 2 characters").max(100),
  code: z
    .string()
    .trim()
    .min(1, "Hostel code is required")
    .max(10, "Hostel code cannot exceed 10 characters")
    .transform((val) => val.toUpperCase()),
  gender: z.enum(["boys", "girls", "mixed"], {
    errorMap: () => ({ message: "Gender must be 'boys', 'girls', or 'mixed'" }),
  }),
  location: z.string().trim().optional().default(""),
  totalFloors: z.coerce.number().int().min(1, "Total floors must be at least 1"),
  allowedYears: z
    .array(z.number().int().min(1).max(6))
    .optional()
    .default([]),
  facilities: z.array(z.string().trim()).optional().default([]),
  rules: z.string().trim().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

/**
 * GET /api/hostels
 * Returns eligible hostels with aggregated room and bed statistics.
 */
export async function GET(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    await connectDB();

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const validation = hostelQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return failure("Invalid query parameters", 400, validation.error.format());
    }

    const result = await getHostelsWithStats(user, validation.data);
    return success(result, "Hostels retrieved successfully");
  } catch (error) {
    console.error("[API_HOSTELS_GET_ERROR]:", error);
    return failure(error.message || "Failed to retrieve hostels", 500);
  }
}

/**
 * POST /api/hostels
 * Admin only: creates a new hostel.
 */
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch {
      return failure("Invalid JSON payload", 400);
    }

    const validation = createHostelSchema.safeParse(body);
    if (!validation.success) {
      return failure("Validation failed", 400, validation.error.format());
    }

    const data = validation.data;

    // Check code uniqueness
    const existingCode = await Hostel.findOne({ code: data.code });
    if (existingCode) {
      return failure(
        `Hostel code "${data.code}" already exists. Please choose a unique code.`,
        400
      );
    }

    const hostel = new Hostel(data);
    await hostel.save();

    return success(hostel, "Hostel created successfully", 201);
  } catch (error) {
    console.error("[API_HOSTELS_POST_ERROR]:", error);
    if (error.code === 11000) {
      return failure("A hostel with this unique code already exists.", 400);
    }
    return failure(error.message || "Failed to create hostel", 500);
  }
}
