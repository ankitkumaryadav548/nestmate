import connectDB from "../lib/db.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import Hostel from "../models/Hostel.js";
import RoommateGroup from "../models/RoommateGroup.js";
import Allocation from "../models/Allocation.js";
import Preference from "../models/Preference.js";
import SelectionWindow from "../models/SelectionWindow.js";
import { getCurrentWindow } from "./selectionWindowService.js";

/**
 * Retrieves comprehensive live statistics for the selection console.
 */
export async function getSelectionOverview() {
  await connectDB();

  const [windowInfo, roomsByStatusRaw, hostels, roomedGroups, unroomedGroups, completedPrefs, allocations] =
    await Promise.all([
      getCurrentWindow(),
      Room.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Hostel.find({ isActive: true }).select("_id name code gender totalFloors").lean(),
      RoommateGroup.find({
        selectedRoom: { $ne: null },
        status: { $in: ["forming", "complete", "locked"] },
      })
        .populate("selectedRoom", "roomNumber floor capacity roomType hostel")
        .populate("leader", "name")
        .lean(),
      RoommateGroup.find({
        selectedRoom: null,
        status: { $in: ["forming", "complete", "locked"] },
      }).lean(),
      Preference.find({ completedAt: { $ne: null } }).select("student roomSize").lean(),
      Allocation.find({ status: "active" }).select("student room hostel group source allocatedAt").lean(),
    ]);

  // 1. Room counts by status
  const roomStatusCounts = {
    available: 0,
    claimed: 0,
    full: 0,
    maintenance: 0,
  };
  roomsByStatusRaw.forEach((r) => {
    if (roomStatusCounts[r._id] !== undefined) {
      roomStatusCounts[r._id] = r.count;
    }
  });

  // 2. Rooms claimed per hostel
  const hostelNameMap = new Map(hostels.map((h) => [h._id.toString(), h]));
  const hostelClaimMap = new Map();
  hostels.forEach((h) => {
    hostelClaimMap.set(h._id.toString(), {
      hostelId: h._id.toString(),
      hostelCode: h.code,
      hostelName: h.name,
      claimedCount: 0,
      totalRooms: 0,
    });
  });

  const allRooms = await Room.find().select("hostel status capacity currentOccupancy roomNumber roomType floor claim").lean();
  let totalBeds = 0;
  let occupiedBeds = 0;
  let reservedBeds = 0;
  let availableBeds = 0;
  const claimedRoomsList = [];

  allRooms.forEach((r) => {
    const hId = r.hostel?.toString();
    const entry = hostelClaimMap.get(hId);
    if (entry) {
      entry.totalRooms += 1;
      if (r.status === "claimed" || r.status === "full") {
        entry.claimedCount += 1;
      }
    }

    const cap = r.capacity || 0;
    const occ = r.currentOccupancy || 0;
    totalBeds += cap;
    occupiedBeds += occ;

    if (r.status === "claimed") {
      reservedBeds += Math.max(0, cap - occ);
      const h = hostelNameMap.get(hId);
      claimedRoomsList.push({
        id: r._id.toString(),
        roomNumber: r.roomNumber,
        hostelName: h?.name || "Hostel",
        roomType: r.roomType,
        capacity: cap,
        occupancy: occ,
        openSeats: Math.max(0, cap - occ),
        floor: r.floor,
      });
    } else if (r.status === "available") {
      availableBeds += cap;
    }
  });

  roomStatusCounts.total = allRooms.length;

  const roomCounts = {
    total: allRooms.length,
    available: roomStatusCounts.available,
    claimed: roomStatusCounts.claimed,
    full: roomStatusCounts.full,
    maintenance: roomStatusCounts.maintenance,
  };

  const bedCounts = {
    total: totalBeds,
    reserved: reservedBeds,
    occupied: occupiedBeds,
    available: availableBeds,
  };

  // 3. Groups with a room versus without (by room size 2, 3, 4)
  const groupsWithRoom = { 2: 0, 3: 0, 4: 0 };
  const groupsWithoutRoom = { 2: 0, 3: 0, 4: 0 };
  let openSeatsTotal = 0;

  roomedGroups.forEach((g) => {
    const sz = g.targetSize;
    if (groupsWithRoom[sz] !== undefined) {
      groupsWithRoom[sz] += 1;
    }
    const memCount = g.members?.length || 0;
    openSeatsTotal += Math.max(0, sz - memCount);
  });

  unroomedGroups.forEach((g) => {
    const sz = g.targetSize;
    if (groupsWithoutRoom[sz] !== undefined) {
      groupsWithoutRoom[sz] += 1;
    }
  });

  // 4. Students without a room (by room size 1, 2, 3, 4)
  const allocatedStudentIds = new Set(allocations.map((a) => a.student?.toString()));
  const studentsWithoutRoom = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let singleRoomStudentsWithRoom = 0;
  let singleRoomStudentsWithoutRoom = 0;

  completedPrefs.forEach((p) => {
    const sId = p.student?.toString();
    const sz = p.roomSize;
    const hasRoom = allocatedStudentIds.has(sId);

    if (sz === 1) {
      if (hasRoom) {
        singleRoomStudentsWithRoom += 1;
      } else {
        singleRoomStudentsWithoutRoom += 1;
      }
    }

    if (!hasRoom && studentsWithoutRoom[sz] !== undefined) {
      studentsWithoutRoom[sz] += 1;
    }
  });

  // 5. Latest 20 room selections
  const latestSelections = [...allocations]
    .filter((a) => a.source === "selection" || a.source === "auto_fill")
    .sort((a, b) => new Date(b.allocatedAt || 0) - new Date(a.allocatedAt || 0))
    .slice(0, 20);

  // Group latest allocations by room
  const roomIds = latestSelections.map((a) => a.room);
  const roomsById = new Map((await Room.find({ _id: { $in: roomIds } }).lean()).map((r) => [r._id.toString(), r]));
  const userIds = latestSelections.map((a) => a.student);
  const usersById = new Map((await User.find({ _id: { $in: userIds } }).select("name").lean()).map((u) => [u._id.toString(), u]));

  const feed = latestSelections.map((a) => {
    const r = roomsById.get(a.room?.toString());
    const h = hostelNameMap.get(r?.hostel?.toString());
    const u = usersById.get(a.student?.toString());
    return {
      allocatedAt: a.allocatedAt,
      studentName: u?.name || "Student",
      hostelCode: h?.code || "",
      hostelName: h?.name || "Hostel",
      roomNumber: r?.roomNumber || "",
      capacity: r?.capacity || 0,
      source: a.source,
    };
  });

  const unitCounts = {
    groupsWithRoom: Object.values(groupsWithRoom).reduce((a, b) => a + b, 0),
    groupsWithoutRoom: Object.values(groupsWithoutRoom).reduce((a, b) => a + b, 0),
    openSeatsInClaimedRooms: openSeatsTotal,
  };

  const candidatePool = {
    totalEligible: Object.values(studentsWithoutRoom).reduce((a, b) => a + b, 0),
  };

  return {
    window: windowInfo,
    roomStatusCounts,
    roomCounts,
    bedCounts,
    unitCounts,
    candidatePool,
    claimedRooms: claimedRoomsList,
    hostelsClaimed: Array.from(hostelClaimMap.values()),
    groupsStats: {
      withRoom: groupsWithRoom,
      withoutRoom: groupsWithoutRoom,
      openSeatsTotal,
    },
    studentsWithoutRoom,
    singleRoomStats: {
      withRoom: singleRoomStudentsWithRoom,
      withoutRoom: singleRoomStudentsWithoutRoom,
    },
    latestSelections: feed,
  };
}

