import Hostel from "@/models/Hostel";
import Room from "@/models/Room";
import User from "@/models/User";

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
    roomsInMaintenance: 0,
  };

  const totalHostels = await Hostel.countDocuments();
  const studentsRegistered = await User.countDocuments({ role: "student" });

  const availableBeds = Math.max(0, roomTotals.totalBeds - roomTotals.occupiedBeds);

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
      },
    },
    {
      $addFields: {
        availableBeds: {
          $max: [0, { $subtract: ["$totalBeds", "$occupiedBeds"] }],
        },
      },
    },
    {
      $sort: { code: 1 },
    },
  ]);

  return {
    totals: {
      hostels: totalHostels,
      rooms: roomTotals.totalRooms,
      totalBeds: roomTotals.totalBeds,
      occupiedBeds: roomTotals.occupiedBeds,
      availableBeds,
      roomsInMaintenance: roomTotals.roomsInMaintenance,
      studentsRegistered,
    },
    hostels: hostelBreakdown,
  };
}
