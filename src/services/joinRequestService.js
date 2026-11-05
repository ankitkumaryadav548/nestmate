import mongoose from "mongoose";
import connectDB from "../lib/db.js";
import User from "../models/User.js";
import Preference from "../models/Preference.js";
import RoommateGroup from "../models/RoommateGroup.js";
import GroupInvitation from "../models/GroupInvitation.js";
import GroupJoinRequest from "../models/GroupJoinRequest.js";
import Allocation from "../models/Allocation.js";
import Room from "../models/Room.js";
import Hostel from "../models/Hostel.js";
import {
  JOIN_ERROR_CODES,
  JOIN_REQUEST_EXPIRY_DAYS,
  MAX_PENDING_JOIN_REQUESTS_PER_STUDENT,
  MAX_JOIN_REQUESTS_PER_STUDENT_PER_DAY,
  MAX_PENDING_JOIN_REQUESTS_PER_GROUP,
  REJECTION_COOLDOWN_HOURS,
  JOIN_REQUEST_MESSAGE_MAX,
} from "../config/groups.js";
import { ROOM_SOURCES } from "../config/selection.js";
import { getSettings } from "./matchingService.js";
import { calculateCompatibility, getSharedLanguages } from "./matching/scoreEngine.js";
import { calculateGroupScore } from "./matching/groupScore.js";
import {
  evaluateJoinFit,
  previewJoinImpact,
  canRequestToJoin,
  shouldAutoCloseRequests,
  isExpired,
} from "./matching/joinRequestRules.js";
import { canJoinRoomedGroup } from "./selection/roomState.js";
import { joinRoomedGroup } from "./roomSelectionService.js";
import { revalidatePreferencesForGroup } from "./roomPreferenceService.js";
import { notify, notifyMany } from "./notificationService.js";

function cleanMessage(text) {
  if (typeof text !== "string") return "";
  return text.replace(/[\x00-\x1F\x7F]/g, " ").replace(/\s+/g, " ").trim().slice(0, JOIN_REQUEST_MESSAGE_MAX);
}

/**
 * Lazily expires pending join requests older than expiresAt.
 */
async function lazyExpireStaleRequests(filter = {}, session = null) {
  const query = {
    ...filter,
    status: "pending",
    expiresAt: { $lte: new Date() },
  };
  const update = {
    $set: {
      status: "expired",
      closeReason: "expired",
      respondedAt: new Date(),
    },
  };
  if (session) {
    await GroupJoinRequest.updateMany(query, update, { session });
  } else {
    await GroupJoinRequest.updateMany(query, update);
  }
}

/**
 * Auto-closes pending requests for a group when full, disbanded, or locked.
 */
export async function closeRequestsForGroup(groupId, reason, session = null) {
  const closeReason = shouldAutoCloseRequests(reason);
  const query = { group: groupId, status: "pending" };
  const update = {
    $set: {
      status: "cancelled",
      closeReason,
      respondedAt: new Date(),
    },
  };

  let closedDocs = [];
  if (session) {
    closedDocs = await GroupJoinRequest.find(query).session(session).lean();
    await GroupJoinRequest.updateMany(query, update, { session });
  } else {
    closedDocs = await GroupJoinRequest.find(query).lean();
    await GroupJoinRequest.updateMany(query, update);
  }

  // Best-effort post-commit notification to requesters
  const friendlyReasons = {
    group_full: "the group is now full",
    group_disbanded: "the group was disbanded",
    group_locked: "the group has been finalized and locked",
    cancelled_by_admin: "the request was cancelled by an administrator",
  };
  const reasonText = friendlyReasons[closeReason] || "the group is no longer accepting requests";

  for (const doc of closedDocs) {
    await notify(
      doc.requester.toString(),
      "join_request_closed",
      { reason: reasonText },
      { dedupeParts: [doc._id.toString(), "closed", closeReason] }
    ).catch(() => {});
  }
}

/**
 * Auto-closes pending requests sent by a student when they join a group.
 */
export async function closeRequestsForRequester(userId, reason, session = null) {
  const closeReason = shouldAutoCloseRequests(reason);
  const query = { requester: userId, status: "pending" };
  const update = {
    $set: {
      status: "cancelled",
      closeReason,
      respondedAt: new Date(),
    },
  };

  if (session) {
    await GroupJoinRequest.updateMany(query, update, { session });
  } else {
    await GroupJoinRequest.updateMany(query, update);
  }
}

/**
 * Browses forming groups that have free seats and match the viewing student's criteria.
 */
export async function listOpenGroups(userId, query = {}) {
  await connectDB();
  await lazyExpireStaleRequests();

  const {
    page = 1,
    limit = 20,
    minScore = 0,
    sameYearOnly = false,
    sharedLanguageOnly = false,
  } = query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  // 1. Fetch viewer profile and preferences
  const [viewer, viewerPref, viewerAlloc, viewerGroup] = await Promise.all([
    User.findById(userId).lean(),
    Preference.findOne({ student: userId }).lean(),
    Allocation.findOne({ student: userId, status: "active" }).lean(),
    RoommateGroup.findOne({
      "members.user": userId,
      status: { $in: ["forming", "complete", "locked"] },
    }).lean(),
  ]);

  if (!viewer || !viewerPref || !viewerPref.completedAt || !viewerPref.roomSize) {
    return {
      groups: [],
      total: 0,
      page: pageNum,
      totalPages: 0,
      viewerStatus: {
        preferencesComplete: false,
        roomSize: viewerPref?.roomSize || null,
      },
    };
  }

  const viewerRoomSize = Number(viewerPref.roomSize);
  const viewerGender = (viewer.gender || "").toLowerCase();
  const settings = await getSettings();

  // 2. Query forming groups with matching gender and targetSize
  const groupFilter = {
    status: "forming",
    gender: viewerGender,
    targetSize: viewerRoomSize,
  };

  if (viewerGroup) {
    groupFilter._id = { $ne: viewerGroup._id };
  }

  const rawGroups = await RoommateGroup.find(groupFilter)
    .populate("members.user", "name course department year gender isDemo")
    .populate("selectedRoom")
    .lean();

  if (rawGroups.length === 0) {
    return {
      groups: [],
      total: 0,
      page: pageNum,
      totalPages: 0,
      viewerStatus: {
        preferencesComplete: true,
        roomSize: viewerRoomSize,
      },
    };
  }

  // 3. Collect member user IDs and fetch all preferences in one batch
  const allMemberUserIds = [];
  rawGroups.forEach((g) => {
    (g.members || []).forEach((m) => {
      if (m.user?._id) allMemberUserIds.push(m.user._id);
    });
  });

  const [allMemberPrefs, allHostels, viewerPendingRequests, viewerPendingInvites] = await Promise.all([
    Preference.find({ student: { $in: allMemberUserIds } }).lean(),
    Hostel.find({ isActive: true }).lean(),
    GroupJoinRequest.find({ requester: userId, status: "pending" }).lean(),
    GroupInvitation.find({ invitedUser: userId, status: "pending" }).lean(),
  ]);

  const prefMap = new Map(allMemberPrefs.map((p) => [p.student.toString(), p]));
  const hostelMap = new Map(allHostels.map((h) => [h._id.toString(), h]));
  const pendingRequestMap = new Map(viewerPendingRequests.map((r) => [r.group.toString(), r]));
  const pendingInviteSet = new Set(viewerPendingInvites.map((inv) => inv.group.toString()));

  const viewerCandidateObj = {
    ...viewer,
    id: viewer._id.toString(),
    preferences: viewerPref,
    roomSize: viewerRoomSize,
  };

  const eligibleGroups = [];

  for (const g of rawGroups) {
    const targetSize = g.targetSize;
    const filledSeats = g.members?.length || 0;
    const openSeats = Math.max(0, targetSize - filledSeats);

    // Must have at least one free seat
    if (openSeats <= 0) continue;

    // Build member roster with preferences
    const groupMembers = (g.members || [])
      .map((m) => {
        const u = m.user;
        if (!u) return null;
        return {
          ...u,
          id: u._id.toString(),
          preferences: prefMap.get(u._id.toString()) || {},
        };
      })
      .filter(Boolean);

    // Hard filter: fit evaluation against all current members
    const fit = evaluateJoinFit(viewerCandidateObj, groupMembers, settings.weights);
    if (!fit.allowed) continue;

    // Roomed group constraint check
    let roomedGroupCheck = true;
    let roomInfo = null;
    if (g.selectedRoom) {
      const roomDoc = g.selectedRoom;
      const hostelDoc = hostelMap.get(roomDoc.hostel?.toString());
      if (!roomDoc || !hostelDoc) {
        continue;
      }
      const roomCheck = canJoinRoomedGroup(viewerCandidateObj, roomDoc, hostelDoc);
      if (!roomCheck.ok) {
        continue;
      }
      roomInfo = {
        hostelName: hostelDoc.name,
        hostelCode: hostelDoc.code,
        roomType: roomDoc.roomType,
        floor: roomDoc.floor,
      };
    }

    // Check optional query filters
    if (minScore > 0 && fit.average < minScore) continue;

    const sameYearCount = groupMembers.filter((m) => m.year === viewer.year).length;
    if (sameYearOnly && sameYearCount === 0) continue;

    const sharedLangs = getSharedLanguages(
      viewerPref.languages || [],
      groupMembers.flatMap((m) => m.preferences?.languages || [])
    );
    if (sharedLanguageOnly && sharedLangs.length === 0) continue;

    // Evaluate if viewer is currently allowed to send request
    const existingReq = pendingRequestMap.get(g._id.toString());
    const hasInvite = pendingInviteSet.has(g._id.toString());

    const canReqCheck = canRequestToJoin({
      student: viewerCandidateObj,
      group: g,
      groupMembers,
      studentGroup: viewerGroup,
      hasActiveAllocation: Boolean(viewerAlloc),
      hasPendingInvitationFromGroup: hasInvite,
      pendingRequestsCount: viewerPendingRequests.length,
      existingPendingForGroup: Boolean(existingReq),
      roomedGroupCheck,
      weights: settings.weights,
    });

    const leaderUser = groupMembers.find((m) => m.id === g.leader?.toString()) || groupMembers[0];
    const leaderName = leaderUser?.name || "Group Leader";

    eligibleGroups.push({
      id: g._id.toString(),
      groupId: g._id.toString(),
      leaderId: g.leader?.toString() || "",
      leaderName,
      members: groupMembers.map((m) => ({
        name: m.name,
        course: m.course,
        department: m.department,
        year: m.year,
        isLeader: m.id === g.leader?.toString(),
      })),
      filledSeats,
      seatsFilled: filledSeats,
      targetSize,
      openSeats,
      average: fit.average,
      averageScoreWithUser: fit.average,
      lowest: fit.lowest,
      perMemberScores: fit.perMemberScores.map((s, idx) => ({
        memberName: groupMembers[idx]?.name || "Roommate",
        score: s.score,
        label: s.label,
      })),
      sharedLanguages: sharedLangs,
      sameYearCount,
      room: roomInfo,
      claimedRoom: roomInfo,
      requestStatus: existingReq?.status || null,
      requestId: existingReq?._id?.toString() || null,
      userHasPendingRequest: existingReq?.status === "pending",
      canRequest: canReqCheck.allowed,
      canRequestCode: canReqCheck.code || null,
      canRequestReason: canReqCheck.reason || null,
      createdAt: g.createdAt,
    });
  }

  // Sort: Average DESC, Lowest DESC, older createdAt ASC
  eligibleGroups.sort((a, b) => {
    if (b.average !== a.average) return b.average - a.average;
    if (b.lowest !== a.lowest) return b.lowest - a.lowest;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const total = eligibleGroups.length;
  const totalPages = Math.ceil(total / limitNum);
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedGroups = eligibleGroups.slice(startIndex, startIndex + limitNum);

  return {
    groups: paginatedGroups,
    total,
    page: pageNum,
    totalPages,
    viewerStatus: {
      preferencesComplete: true,
      roomSize: viewerRoomSize,
      inGroup: Boolean(viewerGroup),
      hasActiveAllocation: Boolean(viewerAlloc),
    },
  };
}

/**
 * Retrieves details, impact preview, and compatibility breakdown for one open group.
 */
export async function getOpenGroup(userId, groupId) {
  await connectDB();
  await lazyExpireStaleRequests();

  const [viewer, viewerPref, viewerAlloc, viewerGroup] = await Promise.all([
    User.findById(userId).lean(),
    Preference.findOne({ student: userId }).lean(),
    Allocation.findOne({ student: userId, status: "active" }).lean(),
    RoommateGroup.findOne({
      "members.user": userId,
      status: { $in: ["forming", "complete", "locked"] },
    }).lean(),
  ]);

  if (!viewer || !viewerPref || !viewerPref.completedAt || !viewerPref.roomSize) {
    const error = new Error(JOIN_ERROR_CODES.PREFERENCES_INCOMPLETE.message);
    error.statusCode = 400;
    error.code = JOIN_ERROR_CODES.PREFERENCES_INCOMPLETE.code;
    throw error;
  }

  const group = await RoommateGroup.findById(groupId)
    .populate("members.user", "name course department year gender isDemo")
    .populate("selectedRoom")
    .lean();

  if (!group || group.status !== "forming") {
    const error = new Error(JOIN_ERROR_CODES.GROUP_NOT_OPEN.message);
    error.statusCode = 404;
    error.code = JOIN_ERROR_CODES.GROUP_NOT_OPEN.code;
    throw error;
  }

  const targetSize = group.targetSize;
  const filledSeats = group.members?.length || 0;
  const openSeats = Math.max(0, targetSize - filledSeats);

  const memberIds = (group.members || []).map((m) => m.user?._id).filter(Boolean);
  const [memberPrefs, hostels, existingReq, existingInvite] = await Promise.all([
    Preference.find({ student: { $in: memberIds } }).lean(),
    Hostel.find({ isActive: true }).lean(),
    GroupJoinRequest.findOne({ group: groupId, requester: userId, status: "pending" }).lean(),
    GroupInvitation.findOne({ group: groupId, invitedUser: userId, status: "pending" }).lean(),
  ]);

  const prefMap = new Map(memberPrefs.map((p) => [p.student.toString(), p]));
  const hostelMap = new Map(hostels.map((h) => [h._id.toString(), h]));

  const groupMembers = (group.members || [])
    .map((m) => {
      const u = m.user;
      if (!u) return null;
      return {
        ...u,
        id: u._id.toString(),
        preferences: prefMap.get(u._id.toString()) || {},
      };
    })
    .filter(Boolean);

  const settings = await getSettings();
  const viewerCandidateObj = {
    ...viewer,
    id: viewer._id.toString(),
    preferences: viewerPref,
    roomSize: Number(viewerPref.roomSize),
  };

  // Evaluate fit
  const fit = evaluateJoinFit(viewerCandidateObj, groupMembers, settings.weights);
  if (!fit.allowed) {
    const error = new Error(JOIN_ERROR_CODES.NOT_COMPATIBLE.message);
    error.statusCode = 409;
    error.code = JOIN_ERROR_CODES.NOT_COMPATIBLE.code;
    throw error;
  }

  // Room check
  let roomInfo = null;
  let roomedCheck = true;
  if (group.selectedRoom) {
    const roomDoc = group.selectedRoom;
    const hostelDoc = hostelMap.get(roomDoc.hostel?.toString());
    const rCheck = canJoinRoomedGroup(viewerCandidateObj, roomDoc, hostelDoc);
    if (!rCheck.ok) {
      roomedCheck = false;
      const error = new Error(JOIN_ERROR_CODES.NOT_COMPATIBLE.message);
      error.statusCode = 409;
      error.code = JOIN_ERROR_CODES.NOT_COMPATIBLE.code;
      throw error;
    }
    roomInfo = {
      hostelName: hostelDoc?.name || "Hostel",
      hostelCode: hostelDoc?.code || "",
      roomType: roomDoc.roomType,
      floor: roomDoc.floor,
    };
  }

  // Impact preview
  const impact = previewJoinImpact(groupMembers, viewerCandidateObj, settings.weights);

  // Pairwise scores and category breakdown
  const reasonsSet = new Set();
  const warningsSet = new Set();

  const perMemberScores = groupMembers.map((m) => {
    const pairRes = calculateCompatibility(viewerCandidateObj, m, settings.weights);
    (pairRes.reasons || []).forEach((r) => reasonsSet.add(r));
    (pairRes.warnings || []).forEach((w) => warningsSet.add(w));

    return {
      memberName: m.name,
      course: m.course,
      department: m.department,
      year: m.year,
      score: pairRes.score,
      label: pairRes.label,
      breakdown: (pairRes.breakdown || []).map((b) => ({
        label: b.label,
        percent: b.percent,
      })),
    };
  });

  const sharedLanguages = getSharedLanguages(
    viewerPref.languages || [],
    groupMembers.flatMap((m) => m.preferences?.languages || [])
  );

  const canReqCheck = canRequestToJoin({
    student: viewerCandidateObj,
    group,
    groupMembers,
    studentGroup: viewerGroup,
    hasActiveAllocation: Boolean(viewerAlloc),
    hasPendingInvitationFromGroup: Boolean(existingInvite),
    existingPendingForGroup: Boolean(existingReq),
    roomedGroupCheck: roomedCheck,
    weights: settings.weights,
  });

  const leaderUser = groupMembers.find((m) => m.id === group.leader?.toString()) || groupMembers[0];
  const leaderName = leaderUser?.name || "Group Leader";

  return {
    id: group._id.toString(),
    groupId: group._id.toString(),
    leaderId: group.leader?.toString() || "",
    leaderName,
    targetSize,
    filledSeats,
    seatsFilled: filledSeats,
    openSeats,
    members: groupMembers.map((m) => ({
      name: m.name,
      course: m.course,
      department: m.department,
      year: m.year,
      isLeader: m.id === group.leader?.toString(),
    })),
    average: fit.average,
    averageScoreWithUser: fit.average,
    lowest: fit.lowest,
    impact,
    perMemberScores,
    sharedLanguages,
    reasons: Array.from(reasonsSet),
    warnings: Array.from(warningsSet),
    room: roomInfo,
    claimedRoom: roomInfo,
    requestStatus: existingReq?.status || null,
    requestId: existingReq?._id?.toString() || null,
    userHasPendingRequest: existingReq?.status === "pending",
    canRequest: canReqCheck.allowed,
    canRequestCode: canReqCheck.code || null,
    canRequestReason: canReqCheck.reason || null,
  };
}

/**
 * Sends a join request to an open forming group.
 */
export async function sendJoinRequest(userId, groupId, data = {}) {
  await connectDB();
  await lazyExpireStaleRequests();

  const now = new Date();
  const message = cleanMessage(data.message || "");

  // 1. Fetch fresh data
  const [student, studentPref, studentAlloc, studentGroup, group] = await Promise.all([
    User.findById(userId).lean(),
    Preference.findOne({ student: userId }).lean(),
    Allocation.findOne({ student: userId, status: "active" }).lean(),
    RoommateGroup.findOne({
      "members.user": userId,
      status: { $in: ["forming", "complete", "locked"] },
    }).lean(),
    RoommateGroup.findById(groupId)
      .populate("members.user", "name course department year gender isDemo")
      .populate("selectedRoom")
      .lean(),
  ]);

  if (!group || group.status !== "forming") {
    const error = new Error(JOIN_ERROR_CODES.GROUP_NOT_OPEN.message);
    error.statusCode = 404;
    error.code = JOIN_ERROR_CODES.GROUP_NOT_OPEN.code;
    throw error;
  }

  // 2. Fetch limits & previous rejections
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [
    pendingRequestsCount,
    requestsToday,
    groupPendingCount,
    existingPending,
    pendingInvite,
    lastRejected,
  ] = await Promise.all([
    GroupJoinRequest.countDocuments({ requester: userId, status: "pending", expiresAt: { $gt: now } }),
    GroupJoinRequest.countDocuments({ requester: userId, createdAt: { $gte: dayAgo } }),
    GroupJoinRequest.countDocuments({ group: groupId, status: "pending", expiresAt: { $gt: now } }),
    GroupJoinRequest.findOne({ group: groupId, requester: userId, status: "pending", expiresAt: { $gt: now } }).lean(),
    GroupInvitation.findOne({ group: groupId, invitedUser: userId, status: "pending" }).lean(),
    GroupJoinRequest.findOne({ group: groupId, requester: userId, status: "rejected" })
      .sort({ respondedAt: -1 })
      .lean(),
  ]);

  const memberIds = (group.members || []).map((m) => m.user?._id).filter(Boolean);
  const [memberPrefs, hostels, settings] = await Promise.all([
    Preference.find({ student: { $in: memberIds } }).lean(),
    Hostel.find({ isActive: true }).lean(),
    getSettings(),
  ]);

  const prefMap = new Map(memberPrefs.map((p) => [p.student.toString(), p]));
  const hostelMap = new Map(hostels.map((h) => [h._id.toString(), h]));

  const groupMembers = (group.members || [])
    .map((m) => {
      const u = m.user;
      if (!u) return null;
      return {
        ...u,
        id: u._id.toString(),
        preferences: prefMap.get(u._id.toString()) || {},
      };
    })
    .filter(Boolean);

  const studentObj = {
    ...student,
    id: student._id.toString(),
    preferences: studentPref,
    roomSize: Number(studentPref?.roomSize),
  };

  let roomedGroupCheck = true;
  if (group.selectedRoom) {
    const roomDoc = group.selectedRoom;
    const hostelDoc = hostelMap.get(roomDoc.hostel?.toString());
    const rCheck = canJoinRoomedGroup(studentObj, roomDoc, hostelDoc);
    if (!rCheck.ok) {
      roomedGroupCheck = false;
    }
  }

  // Validate request eligibility
  const validation = canRequestToJoin({
    student: studentObj,
    group,
    groupMembers,
    studentGroup,
    hasActiveAllocation: Boolean(studentAlloc),
    hasPendingInvitationFromGroup: Boolean(pendingInvite),
    pendingRequestsCount,
    requestsToday,
    groupPendingCount,
    existingPendingForGroup: Boolean(existingPending),
    lastRejectedAt: lastRejected?.respondedAt || null,
    now,
    roomedGroupCheck,
    weights: settings.weights,
  });

  if (!validation.allowed) {
    const error = new Error(validation.reason || JOIN_ERROR_CODES.NOT_COMPATIBLE.message);
    let statusCode = 400;
    if (validation.code === "PENDING_EXISTS" || validation.code === "INVITATION_EXISTS") {
      statusCode = 409;
    } else if (
      validation.code === "COOLDOWN_ACTIVE" ||
      validation.code === "TOO_MANY_PENDING" ||
      validation.code === "DAILY_LIMIT" ||
      validation.code === "GROUP_PENDING_LIMIT"
    ) {
      statusCode = 429;
    }
    error.statusCode = statusCode;
    error.code = validation.code || JOIN_ERROR_CODES.NOT_COMPATIBLE.code;
    throw error;
  }

  // 3. Compute scoreSnapshot
  const fit = evaluateJoinFit(studentObj, groupMembers, settings.weights);
  const scoreSnapshot = {
    average: fit.average,
    lowest: fit.lowest,
    perMember: fit.perMemberScores.map((s) => ({
      user: s.memberId,
      score: s.score,
    })),
  };

  const expiresAt = new Date(now.getTime() + JOIN_REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // 4. Create document atomically
  const joinRequest = new GroupJoinRequest({
    group: groupId,
    requester: userId,
    message,
    status: "pending",
    expiresAt,
    scoreSnapshot,
  });

  try {
    await joinRequest.save();
  } catch (err) {
    if (err.code === 11000) {
      const conflictErr = new Error(JOIN_ERROR_CODES.PENDING_EXISTS.message);
      conflictErr.statusCode = 409;
      conflictErr.code = JOIN_ERROR_CODES.PENDING_EXISTS.code;
      throw conflictErr;
    }
    throw err;
  }

  // 5. Post-commit notification to group leader
  const leaderId = group.leader?.toString();
  if (leaderId) {
    await notify(
      leaderId,
      "join_request_received",
      { name: student.name },
      { dedupeParts: [groupId.toString(), joinRequest._id.toString(), "join_req_received"] }
    ).catch(() => {});
  }

  return {
    success: true,
    id: joinRequest._id.toString(),
    status: "pending",
    group: groupId,
    expiresAt: joinRequest.expiresAt,
    message: joinRequest.message,
    scoreSnapshot,
    joinRequest: {
      id: joinRequest._id.toString(),
      group: groupId,
      status: "pending",
      expiresAt: joinRequest.expiresAt,
      message: joinRequest.message,
      scoreSnapshot,
    },
  };
}

/**
 * Cancels a pending join request (requester only).
 */
export async function cancelJoinRequest(userId, requestId) {
  await connectDB();

  const req = await GroupJoinRequest.findOne({
    _id: requestId,
    requester: userId,
  });

  if (!req) {
    const error = new Error("Join request not found");
    error.statusCode = 404;
    throw error;
  }

  if (req.status !== "pending") {
    const error = new Error(JOIN_ERROR_CODES.REQUEST_NOT_PENDING.message);
    error.statusCode = 409;
    error.code = JOIN_ERROR_CODES.REQUEST_NOT_PENDING.code;
    throw error;
  }

  req.status = "cancelled";
  req.closeReason = "cancelled_by_requester";
  req.respondedAt = new Date();
  await req.save();

  return {
    success: true,
    message: "Join request cancelled successfully",
  };
}

/**
 * Lists requests sent by the current student.
 */
export async function listMySentRequests(userId) {
  await connectDB();
  await lazyExpireStaleRequests({ requester: userId });

  const requests = await GroupJoinRequest.find({ requester: userId })
    .populate({
      path: "group",
      select: "targetSize status members leader selectedRoom",
      populate: [
        { path: "leader", select: "name" },
        { path: "members.user", select: "name course department year" },
        { path: "selectedRoom", select: "roomNumber floor roomType hostel" },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  const allHostels = await Hostel.find().lean();
  const hostelMap = new Map(allHostels.map((h) => [h._id.toString(), h]));

  return requests.map((r) => {
    const g = r.group || {};
    const leader = g.leader || {};
    const members = (g.members || []).map((m) => m.user).filter(Boolean);
    const room = g.selectedRoom;
    const hostel = room ? hostelMap.get(room.hostel?.toString()) : null;

    return {
      id: r._id.toString(),
      groupId: g._id ? g._id.toString() : "",
      groupStatus: g.status || "disbanded",
      leaderName: leader.name || "Group Leader",
      targetSize: g.targetSize || 0,
      filledSeats: members.length,
      members: members.map((m) => ({
        name: m.name,
        course: m.course,
        department: m.department,
        year: m.year,
      })),
      room: room
        ? {
            hostelName: hostel?.name || "Hostel",
            hostelCode: hostel?.code || "",
            roomType: room.roomType,
            floor: room.floor,
          }
        : null,
      message: r.message,
      status: r.status,
      closeReason: r.closeReason,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
      scoreSnapshot: r.scoreSnapshot,
    };
  });
}

/**
 * Retrieves counts for badges: pending sent and pending incoming.
 */
export async function getMyRequestCounts(userId) {
  await connectDB();
  const now = new Date();

  const [pendingSent, leaderGroup] = await Promise.all([
    GroupJoinRequest.countDocuments({ requester: userId, status: "pending", expiresAt: { $gt: now } }),
    RoommateGroup.findOne({ leader: userId, status: "forming" }).select("_id").lean(),
  ]);

  let pendingIncoming = 0;
  if (leaderGroup) {
    pendingIncoming = await GroupJoinRequest.countDocuments({
      group: leaderGroup._id,
      status: "pending",
      expiresAt: { $gt: now },
    });
  }

  return {
    pendingSent,
    pendingIncoming,
    totalBadge: pendingSent + pendingIncoming,
  };
}

/**
 * Lists incoming join requests for the leader of a forming group.
 */
export async function listIncomingRequests(leaderId) {
  await connectDB();

  const group = await RoommateGroup.findOne({
    leader: leaderId,
    status: "forming",
  }).lean();

  if (!group) {
    return {
      hasFormingGroup: false,
      requests: [],
      pendingCount: 0,
    };
  }

  await lazyExpireStaleRequests({ group: group._id });

  const rawRequests = await GroupJoinRequest.find({ group: group._id })
    .populate("requester", "name course department year gender isDemo")
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const requests = rawRequests.map((r) => {
    const u = r.requester || {};
    return {
      id: r._id.toString(),
      requesterId: u._id ? u._id.toString() : "",
      requesterName: u.name || "Student",
      course: u.course || "",
      department: u.department || "",
      year: u.year || 1,
      gender: u.gender || "",
      message: r.message,
      status: r.status,
      closeReason: r.closeReason,
      scoreSnapshot: r.scoreSnapshot,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      respondedAt: r.respondedAt,
    };
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return {
    hasFormingGroup: true,
    groupId: group._id.toString(),
    requests,
    pendingCount,
  };
}

/**
 * Detailed leader review for one specific join request.
 * PRIVACY GUARANTEE: NEVER includes email, phone, registration number, or raw answers.
 */
export async function getRequestReview(leaderId, requestId) {
  await connectDB();
  await lazyExpireStaleRequests({ _id: requestId });

  const request = await GroupJoinRequest.findById(requestId)
    .populate("requester", "name course department year gender isDemo")
    .lean();

  if (!request) {
    const error = new Error("Join request not found");
    error.statusCode = 404;
    throw error;
  }

  const group = await RoommateGroup.findOne({
    _id: request.group,
    leader: leaderId,
  })
    .populate("members.user", "name course department year gender isDemo")
    .populate("selectedRoom")
    .lean();

  if (!group) {
    const error = new Error("Join request not found or you are not the leader of this group");
    error.statusCode = 404;
    throw error;
  }

  const requester = request.requester;
  if (!requester) {
    const error = new Error("Requester account no longer exists");
    error.statusCode = 404;
    throw error;
  }

  const memberIds = (group.members || []).map((m) => m.user?._id).filter(Boolean);
  const [requesterPref, memberPrefs, settings, hostels] = await Promise.all([
    Preference.findOne({ student: requester._id }).lean(),
    Preference.find({ student: { $in: memberIds } }).lean(),
    getSettings(),
    Hostel.find({ isActive: true }).lean(),
  ]);

  const prefMap = new Map(memberPrefs.map((p) => [p.student.toString(), p]));
  const hostelMap = new Map(hostels.map((h) => [h._id.toString(), h]));

  const groupMembers = (group.members || [])
    .map((m) => {
      const u = m.user;
      if (!u) return null;
      return {
        ...u,
        id: u._id.toString(),
        preferences: prefMap.get(u._id.toString()) || {},
      };
    })
    .filter(Boolean);

  const requesterCandidateObj = {
    ...requester,
    id: requester._id.toString(),
    preferences: requesterPref || {},
    roomSize: Number(requesterPref?.roomSize || group.targetSize),
  };

  // Fresh fit evaluation
  const fit = evaluateJoinFit(requesterCandidateObj, groupMembers, settings.weights);
  const impact = previewJoinImpact(groupMembers, requesterCandidateObj, settings.weights);

  // Check physical room constraint if roomed
  let roomedStillFits = true;
  if (group.selectedRoom) {
    const roomDoc = group.selectedRoom;
    const hostelDoc = hostelMap.get(roomDoc.hostel?.toString());
    const rCheck = canJoinRoomedGroup(requesterCandidateObj, roomDoc, hostelDoc);
    if (!rCheck.ok) {
      roomedStillFits = false;
    }
  }

  const stillFits = fit.allowed && roomedStillFits;

  // Pairwise scores and category breakdown
  const reasonsSet = new Set();
  const warningsSet = new Set();

  const perMember = groupMembers.map((m) => {
    const pairRes = calculateCompatibility(requesterCandidateObj, m, settings.weights);
    (pairRes.reasons || []).forEach((r) => reasonsSet.add(r));
    (pairRes.warnings || []).forEach((w) => warningsSet.add(w));

    return {
      memberId: m._id.toString(),
      memberName: m.name,
      course: m.course,
      department: m.department,
      year: m.year,
      score: pairRes.score,
      label: pairRes.label,
      breakdown: (pairRes.breakdown || []).map((b) => ({
        label: b.label,
        percent: b.percent,
      })),
    };
  });

  const sharedLanguages = getSharedLanguages(
    requesterPref?.languages || [],
    groupMembers.flatMap((m) => m.preferences?.languages || [])
  );

  return {
    id: request._id.toString(),
    status: request.status,
    message: request.message,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    respondedAt: request.respondedAt,
    scoreSnapshot: request.scoreSnapshot,
    requester: {
      id: requester._id.toString(),
      name: requester.name,
      course: requester.course,
      department: requester.department,
      year: requester.year,
    },
    sharedLanguages,
    perMember,
    reasons: Array.from(reasonsSet),
    warnings: Array.from(warningsSet),
    impact,
    stillFits,
    canApprove: request.status === "pending" && stillFits && group.members.length < group.targetSize,
  };
}

/**
 * Approves a join request and admits the requester to the group atomically.
 */
export async function approveJoinRequest(leaderId, requestId) {
  await connectDB();

  const now = new Date();
  const session = await mongoose.startSession();

  let notificationsToSend = [];
  let resultSummary = null;

  try {
    await session.withTransaction(async () => {
      // 1. Reload request
      const request = await GroupJoinRequest.findById(requestId).session(session);
      if (!request) {
        const error = new Error("Join request not found");
        error.statusCode = 404;
        throw error;
      }

      if (request.status !== "pending") {
        const error = new Error("This join request is no longer pending.");
        error.statusCode = 409;
        error.code = JOIN_ERROR_CODES.REQUEST_NOT_PENDING.code;
        throw error;
      }

      if (request.expiresAt && new Date(request.expiresAt) <= now) {
        request.status = "expired";
        request.closeReason = "expired";
        request.respondedAt = now;
        await request.save({ session });
        const error = new Error("This join request has expired.");
        error.statusCode = 409;
        throw error;
      }

      // 2. Reload group
      const group = await RoommateGroup.findOne({
        _id: request.group,
        leader: leaderId,
      }).session(session);

      if (!group) {
        const error = new Error("Only the group leader can approve join requests.");
        error.statusCode = 404;
        throw error;
      }

      if (group.status !== "forming") {
        const error = new Error("This group is no longer forming or is already full.");
        error.statusCode = 409;
        error.code = JOIN_ERROR_CODES.GROUP_NOT_OPEN.code;
        throw error;
      }

      if ((group.members?.length || 0) >= group.targetSize) {
        const error = new Error(JOIN_ERROR_CODES.NO_FREE_SEAT.message);
        error.statusCode = 409;
        error.code = JOIN_ERROR_CODES.NO_FREE_SEAT.code;
        throw error;
      }

      // 3. Reload requester & preferences
      const requesterId = request.requester;
      const [requester, requesterPref, requesterAlloc, requesterGroup] = await Promise.all([
        User.findById(requesterId).session(session).lean(),
        Preference.findOne({ student: requesterId }).session(session).lean(),
        Allocation.findOne({ student: requesterId, status: "active" }).session(session).lean(),
        RoommateGroup.findOne({
          "members.user": requesterId,
          status: { $in: ["forming", "complete", "locked"] },
        }).session(session),
      ]);

      if (!requester || !requester.isActive) {
        const error = new Error("Requester student account is inactive.");
        error.statusCode = 409;
        throw error;
      }

      if (requesterAlloc) {
        const error = new Error("This student can no longer join (they have already been allocated a room).");
        error.statusCode = 409;
        error.code = JOIN_ERROR_CODES.ALREADY_HAS_ROOM.code;
        throw error;
      }

      // If requester belongs to another group, allow ONLY if solo leader of forming group with no selectedRoom
      let soloGroupToDisband = null;
      if (requesterGroup) {
        if (requesterGroup._id.toString() === group._id.toString()) {
          const error = new Error("Student is already a member of this group.");
          error.statusCode = 409;
          throw error;
        }

        if (requesterGroup.selectedRoom) {
          const error = new Error("This student can no longer join (they have selected a room in another group).");
          error.statusCode = 409;
          throw error;
        }

        const isSoloLeader =
          requesterGroup.leader.toString() === requesterId.toString() &&
          (!requesterGroup.members || requesterGroup.members.length <= 1);

        if (!isSoloLeader) {
          const error = new Error("This student can no longer join (they already joined another roommate group).");
          error.statusCode = 409;
          error.code = JOIN_ERROR_CODES.ALREADY_IN_GROUP.code;
          throw error;
        }

        soloGroupToDisband = requesterGroup;
      }

      // 4. Verify fit on fresh group member preferences
      const memberIds = (group.members || []).map((m) => m.user);
      const [memberPrefs, hostels, settings] = await Promise.all([
        Preference.find({ student: { $in: memberIds } }).session(session).lean(),
        Hostel.find().session(session).lean(),
        getSettings(),
      ]);

      const prefMap = new Map(memberPrefs.map((p) => [p.student.toString(), p]));
      const hostelMap = new Map(hostels.map((h) => [h._id.toString(), h]));

      const groupMembers = (group.members || []).map((m) => ({
        id: m.user.toString(),
        preferences: prefMap.get(m.user.toString()) || {},
      }));

      const requesterCandidateObj = {
        ...requester,
        id: requester._id.toString(),
        preferences: requesterPref || {},
        roomSize: Number(requesterPref?.roomSize || group.targetSize),
      };

      const fit = evaluateJoinFit(requesterCandidateObj, groupMembers, settings.weights);
      if (!fit.allowed) {
        const error = new Error("This student can no longer join (the group compatibility requirements are not met).");
        error.statusCode = 409;
        error.code = JOIN_ERROR_CODES.NOT_COMPATIBLE.code;
        throw error;
      }

      // 5. Roomed group check
      if (group.selectedRoom) {
        const roomDoc = await Room.findById(group.selectedRoom).session(session).lean();
        const hostelDoc = roomDoc ? hostelMap.get(roomDoc.hostel?.toString()) : null;
        if (!roomDoc || !hostelDoc) {
          throw new Error("Group selected room could not be loaded");
        }
        const rCheck = canJoinRoomedGroup(requesterCandidateObj, roomDoc, hostelDoc);
        if (!rCheck.ok) {
          const error = new Error("This student can no longer join (room constraints conflict).");
          error.statusCode = 409;
          throw error;
        }
      }

      // 5.5 If requester was a solo leader, disband their solo group first
      // (This avoids violating the partial unique index on members.user across active groups)
      if (soloGroupToDisband) {
        await RoommateGroup.updateOne(
          { _id: soloGroupToDisband._id },
          { $set: { status: "disbanded", disbandedAt: now } },
          { session }
        );

        // Cancel its outgoing invitations and incoming join requests
        await GroupInvitation.updateMany(
          { group: soloGroupToDisband._id, status: "pending" },
          { $set: { status: "cancelled", respondedAt: now } },
          { session }
        );
        await GroupJoinRequest.updateMany(
          { group: soloGroupToDisband._id, status: "pending" },
          { $set: { status: "cancelled", closeReason: "group_disbanded", respondedAt: now } },
          { session }
        );
      }

      // 6. CONDITIONAL UPDATE ON GROUP: Add member atomically
      const groupUpdate = await RoommateGroup.updateOne(
        {
          _id: group._id,
          status: "forming",
          "members.user": { $ne: requesterId },
          $expr: { $lt: [{ $size: "$members" }, "$targetSize"] },
        },
        {
          $push: {
            members: {
              user: requesterId,
              joinedAt: now,
            },
          },
        },
        { session }
      );

      if (groupUpdate.matchedCount !== 1) {
        const error = new Error("This student can no longer join (the seat was taken or the situation changed)");
        error.statusCode = 409;
        error.code = JOIN_ERROR_CODES.NO_FREE_SEAT.code;
        throw error;
      }

      // 7. Mark request approved
      request.status = "approved";
      request.respondedAt = now;
      request.respondedBy = leaderId;
      await request.save({ session });

      // 8. If group has selectedRoom, join open bed atomically
      if (group.selectedRoom) {
        await joinRoomedGroup(group._id, requesterId, {
          session,
          source: ROOM_SOURCES.SELECTION,
        });
      }



      // 10. Close all other pending join requests sent by requester
      await GroupJoinRequest.updateMany(
        { requester: requesterId, status: "pending", _id: { $ne: request._id } },
        {
          $set: {
            status: "cancelled",
            closeReason: "requester_joined_elsewhere",
            respondedAt: now,
          },
        },
        { session }
      );

      // Cancel all incoming invitations of requester
      await GroupInvitation.updateMany(
        { invitedUser: requesterId, status: "pending" },
        { $set: { status: "cancelled", respondedAt: now } },
        { session }
      );

      // 11. Recompute scores for newly formed roster
      const updatedMembers = [...groupMembers, requesterCandidateObj];
      const newScore = calculateGroupScore(updatedMembers, settings.weights);
      const isFull = updatedMembers.length >= group.targetSize;

      const groupPatch = {
        averageScore: newScore.average,
        lowestPairScore: newScore.lowest,
      };

      if (isFull) {
        // Full group transitions to complete (unless roomed, which is locked during finalize)
        if (!group.selectedRoom) {
          groupPatch.status = "complete";
          groupPatch.completedAt = now;
        }

        // Cancel remaining pending invitations for this group
        await GroupInvitation.updateMany(
          { group: group._id, status: "pending" },
          { $set: { status: "cancelled", respondedAt: now } },
          { session }
        );

        // Auto-close remaining pending join requests for this group
        await GroupJoinRequest.updateMany(
          { group: group._id, status: "pending" },
          {
            $set: {
              status: "cancelled",
              closeReason: "group_full",
              respondedAt: now,
            },
          },
          { session }
        );
      }

      await RoommateGroup.updateOne({ _id: group._id }, { $set: groupPatch }, { session });

      // Queue post-commit notifications
      const leaderDoc = await User.findById(leaderId).session(session).lean();
      const leaderName = leaderDoc?.name || "The leader";

      notificationsToSend.push({
        userId: requesterId.toString(),
        type: "join_request_approved",
        params: {
          leaderName,
          hasRoom: Boolean(group.selectedRoom),
        },
      });

      const existingOtherMemberIds = (group.members || [])
        .map((m) => m.user.toString())
        .filter((id) => id !== requesterId.toString());

      for (const mId of existingOtherMemberIds) {
        notificationsToSend.push({
          userId: mId,
          type: "group_member_joined",
          params: { name: requester.name },
        });
      }

      resultSummary = {
        success: true,
        groupId: group._id.toString(),
        status: isFull && !group.selectedRoom ? "complete" : group.status,
        membersCount: updatedMembers.length,
        averageScore: newScore.average,
        lowestPairScore: newScore.lowest,
      };
    });
  } finally {
    await session.endSession();
  }

  // Best-effort post-commit tasks
  revalidatePreferencesForGroup(resultSummary?.groupId).catch(() => {});

  for (const n of notificationsToSend) {
    await notify(n.userId, n.type, n.params).catch(() => {});
  }

  return resultSummary;
}

/**
 * Rejects a join request (leader only).
 */
export async function rejectJoinRequest(leaderId, requestId) {
  await connectDB();

  const now = new Date();
  const request = await GroupJoinRequest.findById(requestId);
  if (!request) {
    const error = new Error("Join request not found");
    error.statusCode = 404;
    throw error;
  }

  if (request.status !== "pending") {
    const error = new Error("This join request is no longer pending.");
    error.statusCode = 409;
    error.code = JOIN_ERROR_CODES.REQUEST_NOT_PENDING.code;
    throw error;
  }

  const group = await RoommateGroup.findOne({
    _id: request.group,
    leader: leaderId,
  });

  if (!group) {
    const error = new Error("Only the group leader can reject join requests.");
    error.statusCode = 404;
    throw error;
  }

  request.status = "rejected";
  request.respondedAt = now;
  request.respondedBy = leaderId;
  await request.save();

  // Post-commit neutral notification
  const leaderUser = await User.findById(leaderId).select("name").lean();
  const leaderName = leaderUser?.name || "the group leader";

  await notify(
    request.requester.toString(),
    "join_request_rejected",
    { leaderName },
    { dedupeParts: [request._id.toString(), "rejected"] }
  ).catch(() => {});

  return {
    success: true,
    message: "Join request rejected.",
  };
}
