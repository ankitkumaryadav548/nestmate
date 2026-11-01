import Hostel from "@/models/Hostel";
import Room from "@/models/Room";
import User from "@/models/User";
import StudentProfile from "@/models/StudentProfile";
import Preference from "@/models/Preference";
import { getGroupStats } from "@/services/groupService";

/**
 * Computes administrative overview statistics using MongoDB aggregation pipelines.
 * 
 * Returns:
 * - totals: { hostels, rooms, totalBeds, occupiedBeds, availableBeds, roomsInMaintenance, studentsRegistered }
 * - breakdown: per-hostel stats (name, code, gender, totalFloors, totalRooms, totalBeds, occupiedBeds, availableBeds)
 */
export async function getAdminStats() {
  // Aggregate room totals
  const roomAgg = await Room.aggregate([
    {
      $group: {
        _id: null,
        totalRooms: { $sum: 1 },
        totalBeds: { $sum: "$capacity" },
        occupiedBeds: { $sum: "$currentOccupancy" },
        reservedBeds: {
          $sum: {
            $cond: [
              { $eq: ["$status", "claimed"] },
              { $max: [0, { $subtract: ["$capacity", "$currentOccupancy"] }] },
              0,
            ],
          },
        },
        availableBeds: {
          $sum: {
            $cond: [{ $eq: ["$status", "available"] }, "$capacity", 0],
          },
        },
        roomsInMaintenance: {
          $sum: {
            $cond: [{ $eq: ["$status", "maintenance"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const roomTotals = roomAgg[0] || {
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    reservedBeds: 0,
    availableBeds: 0,
    roomsInMaintenance: 0,
  };

  const totalHostels = await Hostel.countDocuments();
  const studentsRegistered = await User.countDocuments({ role: "student" });
  const studentsWithCompletedPreferences = await Preference.countDocuments({ completedAt: { $ne: null } });
  const studentsWithPendingPreferences = Math.max(0, studentsRegistered - studentsWithCompletedPreferences);
  const internationalStudents = await StudentProfile.countDocuments({ isInternational: true });

  const availableBeds = roomTotals.availableBeds || 0;
  const reservedBeds = roomTotals.reservedBeds || 0;

  // Per-hostel breakdown
  const hostelBreakdown = await Hostel.aggregate([
    {
      $lookup: {
        from: "rooms",
        localField: "_id",
        foreignField: "hostel",
        as: "roomsList",
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        code: 1,
        gender: 1,
        isActive: 1,
        totalFloors: 1,
        totalRooms: { $size: "$roomsList" },
        totalBeds: { $sum: "$roomsList.capacity" },
        occupiedBeds: { $sum: "$roomsList.currentOccupancy" },
        reservedBeds: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$roomsList",
                  as: "r",
                  cond: { $eq: ["$$r.status", "claimed"] },
                },
              },
              as: "cr",
              in: { $max: [0, { $subtract: ["$$cr.capacity", "$$cr.currentOccupancy"] }] },
            },
          },
        },
        availableBeds: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$roomsList",
                  as: "r",
                  cond: { $eq: ["$$r.status", "available"] },
                },
              },
              as: "ar",
              in: "$$ar.capacity",
            },
          },
        },
      },
    },
    {
      $sort: { code: 1 },
    },
  ]);

  const groupStats = await getGroupStats();

  // Query latest draft allocation run
  let latestDraftRun = null;
  try {
    const AllocationRun = (await import("@/models/AllocationRun")).default;
    const draftDoc = await AllocationRun.findOne({ status: "draft" })
      .sort({ createdAt: -1 })
      .select("_id createdAt stats waitlistCount")
      .lean();

    if (draftDoc) {
      latestDraftRun = {
        id: draftDoc._id.toString(),
        createdAt: draftDoc.createdAt,
        studentsAllocated: draftDoc.stats?.counts?.studentsAllocated || 0,
        waitlisted: draftDoc.waitlistCount || 0,
      };
    }
  } catch (err) {
    console.error("[StatsService LatestDraftRun Error]:", err);
  }

  // Allocation and published counts
  let publishedAllocationsCount = 0;
  let studentsAllocated = 0;
  let publishedRunsCount = 0;
  let draftRunsCount = 0;
  try {
    const Allocation = (await import("@/models/Allocation")).default;
    const AllocationRun = (await import("@/models/AllocationRun")).default;

    publishedAllocationsCount = await Allocation.countDocuments({ status: "active" });
    const allocatedStudentsList = await Allocation.find({ status: "active" }).distinct("student");
    studentsAllocated = allocatedStudentsList.length;

    publishedRunsCount = await AllocationRun.countDocuments({ status: "published" });
    draftRunsCount = await AllocationRun.countDocuments({ status: "draft" });
  } catch (err) {
    console.error("[StatsService Allocation Counts Error]:", err);
  }

  // Selection stats
  let selectionStats = {
    windowStatus: "none",
    roomsClaimed: 0,
    groupsWithRoom: 0,
    openSeats: 0,
  };
  try {
    const SelectionWindow = (await import("@/models/SelectionWindow")).default;
    const RoommateGroup = (await import("@/models/RoommateGroup")).default;
    const { effectiveWindowStatus } = await import("@/services/selection/windowStatus");

    const liveWindow = await SelectionWindow.findOne({ isActive: true }).lean();
    selectionStats.windowStatus = liveWindow ? effectiveWindowStatus(liveWindow) : "none";

    const [claimedRoomsCount, roomedGroupsList] = await Promise.all([
      Room.countDocuments({ status: { $in: ["claimed", "full"] } }),
      RoommateGroup.find({
        selectedRoom: { $ne: null },
        status: { $in: ["forming", "complete", "locked"] },
      })
        .select("targetSize members")
        .lean(),
    ]);

    selectionStats.roomsClaimed = claimedRoomsCount;
    selectionStats.groupsWithRoom = roomedGroupsList.length;
    let openSeatsSum = 0;
    roomedGroupsList.forEach((g) => {
      openSeatsSum += Math.max(0, (g.targetSize || 0) - (g.members?.length || 0));
    });
    selectionStats.openSeats = openSeatsSum;
  } catch (err) {
    console.error("[StatsService Selection Stats Error]:", err);
  }

  const studentsUnallocated = Math.max(0, studentsRegistered - studentsAllocated);
  const roomsOccupied = await Room.countDocuments({ currentOccupancy: { $gt: 0 } });

  return {
    totals: {
      hostels: totalHostels,
      rooms: roomTotals.totalRooms,
      totalBeds: roomTotals.totalBeds,
      occupiedBeds: roomTotals.occupiedBeds,
      reservedBeds,
      availableBeds,
      roomsInMaintenance: roomTotals.roomsInMaintenance,
      roomsOccupied,
      studentsRegistered,
      studentsWithCompletedPreferences,
      studentsWithPendingPreferences,
      internationalStudents,
      groups: groupStats,
      selection: selectionStats,
      latestDraftRun,
      publishedAllocationsCount,
      studentsAllocated,
      studentsUnallocated,
      publishedRunsCount,
      draftRunsCount,
    },
    hostels: hostelBreakdown,
  };
}

