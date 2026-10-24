import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { requireRole } from "@/middleware-helpers/authGuard";
import { failure } from "@/lib/apiResponse";
import AllocationAssignment from "@/models/AllocationAssignment";
import User from "@/models/User";

/**
 * Sanitizes a cell to prevent CSV injection / formula execution vulnerabilities.
 * Prefixes cells beginning with =, +, -, or @ with an apostrophe.
 * Escapes internal quotes according to RFC 4180.
 * 
 * @param {string|number|null|undefined} value 
 * @returns {string}
 */
function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();

  // Formula injection defense: prefix dangerous leading characters
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * GET /api/admin/allocations/[id]/export
 * Generates and downloads a CSV export of assigned rooms and student occupants.
 * 
 * Columns: Hostel, Room, Floor, Room Type, Member Name, Registration Number, Course, Year, Phone, Group Average
 * 
 * Access: Administrator only.
 */
export async function GET(request, { params }) {
  try {
    const { errorResponse } = await requireRole("admin", request);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("Invalid allocation run ID", 400);
    }

    await connectDB();

    const assignments = await AllocationAssignment.find({
      run: id,
      status: "assigned",
    })
      .populate("room")
      .populate("hostel")
      .sort({ "hostel.code": 1, "room.roomNumber": 1 })
      .lean();

    // Collect all member IDs
    const memberIds = [];
    assignments.forEach((a) => {
      (a.members || []).forEach((m) => memberIds.push(m));
    });

    const users = await User.find({ _id: { $in: memberIds } }).lean();
    const userMap = new Map();
    users.forEach((u) => userMap.set(String(u._id), u));

    // CSV Header row
    const headers = [
      "Hostel",
      "Room",
      "Floor",
      "Room Type",
      "Member Name",
      "Registration Number",
      "Course",
      "Year",
      "Phone",
      "Group Average",
    ];

    const rows = [headers.map(sanitizeCsvCell).join(",")];

    for (const a of assignments) {
      const hostelName = a.hostel?.name || a.hostel?.code || "N/A";
      const roomNum = a.room?.roomNumber || "N/A";
      const floor = a.room?.floor !== undefined ? a.room.floor : "N/A";
      const roomType = a.room?.roomType || "N/A";
      const groupAvg = a.groupAverage !== null && a.groupAverage !== undefined ? a.groupAverage : "N/A";

      for (const mId of a.members || []) {
        const u = userMap.get(String(mId)) || {};
        const row = [
          sanitizeCsvCell(hostelName),
          sanitizeCsvCell(roomNum),
          sanitizeCsvCell(floor),
          sanitizeCsvCell(roomType),
          sanitizeCsvCell(u.name || "Unknown"),
          sanitizeCsvCell(u.registrationNumber || "N/A"),
          sanitizeCsvCell(u.course || "N/A"),
          sanitizeCsvCell(u.year || "N/A"),
          sanitizeCsvCell(u.phone || "N/A"),
          sanitizeCsvCell(groupAvg),
        ];
        rows.push(row.join(","));
      }
    }

    const csvContent = rows.join("\r\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="allocation-run-${id}.csv"`,
      },
    });
  } catch (error) {
    console.error("[Export Allocation CSV Error]:", error);
    return failure(error.message || "Failed to export CSV", error.status || 500);
  }
}
