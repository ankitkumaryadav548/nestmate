import connectDB from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Health check endpoint.
 * Verifies backend availability and tests MongoDB connectivity.
 * 
 * Response shape:
 * {
 *   success: true,
 *   message: "HostelMatch API running",
 *   database: "connected" | "disconnected",
 *   time: "<ISO date string>"
 * }
 */
export async function GET() {
  let databaseStatus = "disconnected";

  try {
    // Attempt database connection
    await connectDB();
    databaseStatus = "connected";
  } catch (error) {
    // Gracefully handle missing or unreachable DB without crashing
    console.warn(`[Health Check] Database unreachable: ${error.message}`);
    databaseStatus = "disconnected";
  }

  try {
    return NextResponse.json(
      {
        success: true,
        message: "HostelMatch API running",
        database: databaseStatus,
        time: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (fatalError) {
    // Catch-all to ensure we never crash and never leak stack traces
    console.error("[Health Check Fatal Error]", fatalError.message);
    return NextResponse.json(
      {
        success: false,
        message: "HostelMatch API error occurred",
        database: "disconnected",
        time: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
