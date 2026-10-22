import mongoose from "mongoose";
import Hostel from "@/models/Hostel";
import Room from "@/models/Room";

/**
 * Builds the MongoDB query filter for hostel eligibility based on user role and profile.
 * 
 * Rules:
 * - Admin sees all hostels.
 * - Students see ONLY active hostels where:
 *   - male: ["boys", "mixed"]
 *   - female: ["girls", "mixed"]
 *   - other: ["mixed"]
 *   - If student has academic year set and hostel specifies allowedYears, year must be allowed.
 */
export function buildHostelEligibilityQuery(user, customFilters = {}) {
  const query = { ...customFilters };

  if (!user || user.role === "student") {
    // Only active hostels for students
    query.isActive = true;

    if (user) {
      // Gender eligibility
      if (user.gender === "male") {
        query.gender = { $in: ["boys", "mixed"] };
      } else if (user.gender === "female") {
        query.gender = { $in: ["girls", "mixed"] };
      } else {
        query.gender = "mixed";
      }

      // Year eligibility
      if (user.year && typeof user.year === "number") {
        query.$or = [
          { allowedYears: { $size: 0 } },
          { allowedYears: user.year },
        ];
      }
    }
  }

  return query;
}

/**
 * Retrieves hostels with aggregated room capacity, occupancy, and availability stats.
 */
export async function getHostelsWithStats(user, options = {}) {
  const {
    gender,
    isActive,
    search,
    page = 1,
    limit = 20,
    sortBy = "code",
    sortOrder = "asc",
  } = options;

  const filters = {};
  if (gender) filters.gender = gender;
  if (isActive !== undefined && isActive !== "") {
    filters.isActive = isActive === true || isActive === "true";
  }

  if (search && search.trim()) {
    const s = search.trim();
    filters.$or = [
      { name: { $regex: s, $options: "i" } },
      { code: { $regex: s, $options: "i" } },
      { location: { $regex: s, $options: "i" } },
    ];
  }

  // Apply student eligibility restrictions
  const matchQuery = buildHostelEligibilityQuery(user, filters);

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder === "desc" ? -1 : 1;
  const sortObj = {};
  sortObj[sortBy] = sortDirection;

  const pipeline = [
    { $match: matchQuery },
    {
      $lookup: {
        from: "rooms",
        localField: "_id",
        foreignField: "hostel",
        as: "roomsData",
      },
    },
    {
      $addFields: {
        totalRooms: { $size: "$roomsData" },
        totalCapacity: { $sum: "$roomsData.capacity" },
        occupiedBeds: { $sum: "$roomsData.currentOccupancy" },
        maintenanceRooms: {
          $size: {
            $filter: {
              input: "$roomsData",
              as: "r",
              cond: { $eq: ["$$r.status", "maintenance"] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        availableBeds: {
          $max: [0, { $subtract: ["$totalCapacity", "$occupiedBeds"] }],
        },
      },
    },
    {
      $project: {
        roomsData: 0,
      },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $sort: sortObj }, { $skip: skip }, { $limit: limitNum }],
      },
    },
  ];

  const result = await Hostel.aggregate(pipeline);
  const total = result[0]?.metadata[0]?.total || 0;
  const data = result[0]?.data || [];

  return {
    hostels: data,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Retrieves a single hostel by ID with calculated room and bed statistics.
 */
export async function getHostelByIdWithStats(id, user) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const hostelId = new mongoose.Types.ObjectId(id);
  const matchQuery = buildHostelEligibilityQuery(user, { _id: hostelId });

  const pipeline = [
    { $match: matchQuery },
    {
      $lookup: {
        from: "rooms",
        localField: "_id",
        foreignField: "hostel",
        as: "roomsData",
      },
    },
    {
      $addFields: {
        totalRooms: { $size: "$roomsData" },
        totalCapacity: { $sum: "$roomsData.capacity" },
        occupiedBeds: { $sum: "$roomsData.currentOccupancy" },
        maintenanceRooms: {
          $size: {
            $filter: {
              input: "$roomsData",
              as: "r",
              cond: { $eq: ["$$r.status", "maintenance"] },
            },
          },
        },
      },
    },
    {
      $addFields: {
        availableBeds: {
          $max: [0, { $subtract: ["$totalCapacity", "$occupiedBeds"] }],
        },
      },
    },
    {
      $project: {
        roomsData: 0,
      },
    },
  ];

  const results = await Hostel.aggregate(pipeline);
  return results[0] || null;
}

/**
 * Updates a hostel with safety checks (prevent changing gender if rooms are occupied).
 */
export async function updateHostel(id, updateData) {
  const existing = await Hostel.findById(id);
  if (!existing) {
    throw new Error("Hostel not found");
  }

  // If gender is changing, verify no rooms have occupants
  if (updateData.gender && updateData.gender !== existing.gender) {
    const occupiedCount = await Room.countDocuments({
      hostel: id,
      currentOccupancy: { $gt: 0 },
    });
    if (occupiedCount > 0) {
      throw new Error(
        `Cannot change hostel gender designation: ${occupiedCount} room(s) currently have student occupants.`
      );
    }
  }

  // If code is changing, check uniqueness
  if (updateData.code && updateData.code.toUpperCase() !== existing.code) {
    const codeDuplicate = await Hostel.findOne({
      code: updateData.code.toUpperCase(),
      _id: { $ne: id },
    });
    if (codeDuplicate) {
      throw new Error(`Hostel code "${updateData.code.toUpperCase()}" is already assigned to another hostel.`);
    }
  }

  Object.assign(existing, updateData);
  return await existing.save();
}

/**
 * Deletes a hostel and all its rooms if no rooms have active occupants.
 */
export async function deleteHostel(id) {
  const existing = await Hostel.findById(id);
  if (!existing) {
    throw new Error("Hostel not found");
  }

  const occupiedRooms = await Room.countDocuments({
    hostel: id,
    currentOccupancy: { $gt: 0 },
  });

  if (occupiedRooms > 0) {
    throw new Error(
      `Cannot delete hostel: ${occupiedRooms} room(s) currently have active occupants.`
    );
  }

  // Delete all associated rooms first, then the hostel
  await Room.deleteMany({ hostel: id });
  await Hostel.findByIdAndDelete(id);

  return { success: true, deletedHostel: existing };
}
