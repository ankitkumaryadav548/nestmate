import mongoose from "mongoose";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Preference from "@/models/Preference";
import RoommateGroup from "@/models/RoommateGroup";
import GroupInvitation from "@/models/GroupInvitation";
import AllocationIntent from "@/models/AllocationIntent";
import { getSettings } from "@/services/matchingService";
import { calculateGroupScore, canJoinGroup } from "@/services/matching/groupScore";
import {
  GROUP_SIZE_OPTIONS,
  INVITE_EXPIRY_DAYS,
  MAX_INVITES_PER_STUDENT_PER_DAY,
  PENDING_INVITE_BUFFER,
  MIN_PAIR_SCORE,
} from "@/config/groups";
import { revalidatePreferencesForGroup } from "./roomPreferenceService";
import { suggestDefaultAcType } from "./roomPreferences/preferenceLogic";

/**
 * FAIRNESS & INTEGRITY GUARANTEE:
 * Group formation operates solely on voluntary lifestyle answers.
 * Nationality, home country, state, and ethnicity are strictly barred from all group queries and calculations.
 * Strict gender isolation is enforced: every member of a group must have identical gender.
 */

/**
 * Formats a student into a safe public profile for group peers.
 * Never leaks email, phone, registration number, raw preference answers, or location data.
 */
function formatPublicMember(user, isLeader = false, joinedAt = null) {
  return {
    id: user._id.toString(),
    name: user.name,
    course: user.course || "Not specified",
    department: user.department || "",
    year: user.year || null,
    isLeader,
    joinedAt,
  };
}

/**
 * Creates a new roommate group with the authenticated student as leader.
 * 
 * @param {string} userId 
 * @param {number} targetSize 
 * @returns {Promise<object>}
 */
export async function createGroup(userId, targetSize) {
  await connectDB();

  const parsedSize = Number(targetSize);
  if (!GROUP_SIZE_OPTIONS.includes(parsedSize)) {
    throw new Error(`Target room size must be one of: [${GROUP_SIZE_OPTIONS.join(", ")}]`);
  }

  // 1. Verify student and completed questionnaire
  const user = await User.findById(userId).lean();
  if (!user || user.role !== "student" || !user.isActive) {
    throw new Error("Active student account required");
  }

  const pref = await Preference.findOne({ student: userId }).lean();
  if (!pref || !pref.completedAt) {
    const error = new Error("Complete your preferences questionnaire first");
    error.code = "PREFERENCES_INCOMPLETE";
    throw error;
  }

  // 2. Check if student already belongs to an active group
  const existingGroup = await RoommateGroup.findOne({
    "members.user": userId,
    status: { $in: ["forming", "complete", "locked"] },
  }).lean();

  if (existingGroup) {
    throw new Error("You are already a member of an active roommate group");
  }

  const defaultAc = suggestDefaultAcType([{ ...user, preferences: pref }]);

  // 3. Create group with leader as initial member
  const newGroup = await RoommateGroup.create({
    leader: userId,
    gender: user.gender,
    targetSize: parsedSize,
    members: [{ user: userId, joinedAt: new Date() }],
    status: "forming",
    averageScore: 100,
    lowestPairScore: 100,
    isDemo: Boolean(user.isDemo),
    roomPreferences: {
      preferredHostels: [],
      acType: defaultAc,
      floorPreference: "any",
      updatedAt: new Date(),
      updatedBy: userId,
    },
    preferencesNeedReview: false,
  });

  // 4. Update or create student's AllocationIntent
  await AllocationIntent.findOneAndUpdate(
    { user: userId },
    { $set: { mode: "group", preferredRoomSize: parsedSize } },
    { upsert: true, new: true }
  );

  return newGroup;
}

/**
 * Retrieves the authenticated student's active roommate group.
 * 
 * @param {string} userId 
 * @returns {Promise<object|null>}
 */
export async function getMyGroup(userId) {
  await connectDB();

  const group = await RoommateGroup.findOne({
    "members.user": userId,
    status: { $in: ["forming", "complete", "locked"] },
  })
    .populate("roomPreferences.preferredHostels", "name code gender totalFloors facilities")
    .lean();

  if (!group) return null;

  // Populate all members and their preferences
  const memberUserIds = group.members.map((m) => m.user);
  const [memberUsers, memberPrefs, settings] = await Promise.all([
    User.find({ _id: { $in: memberUserIds } }).lean(),
    Preference.find({ student: { $in: memberUserIds } }).lean(),
    getSettings(),
  ]);

  const userMap = new Map();
  memberUsers.forEach((u) => userMap.set(u._id.toString(), u));

  const prefMap = new Map();
  memberPrefs.forEach((p) => prefMap.set(p.student.toString(), p));

  const isLeader = group.leader.toString() === userId.toString();

  // Construct plain member objects for scoreEngine
  const plainMembers = [];
  const formattedMembers = [];

  for (const m of group.members) {
    const u = userMap.get(m.user.toString());
    if (u) {
      const p = prefMap.get(m.user.toString());
      plainMembers.push({ ...u, preferences: p || {} });
      formattedMembers.push(
        formatPublicMember(
          u,
          m.user.toString() === group.leader.toString(),
          m.joinedAt
        )
      );
    }
  }

  // Compute pairwise breakdown
  const groupScores = calculateGroupScore(plainMembers, settings.weights);

  const formattedPairs = groupScores.pairs.map((p) => ({
    memberA: formattedMembers[p.a]?.name || "Member",
    memberB: formattedMembers[p.b]?.name || "Member",
    score: p.score,
    label: p.label,
    excluded: p.excluded,
  }));

  // Fetch pending invitations if user is the leader
  let pendingInvitations = [];
  if (isLeader && group.status === "forming") {
    // Lazy expire stale invitations
    await GroupInvitation.updateMany(
      { group: group._id, status: "pending", expiresAt: { $lte: new Date() } },
      { $set: { status: "expired" } }
    );

    const invites = await GroupInvitation.find({
      group: group._id,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("invitedUser", "name course department year gender")
      .lean();

    pendingInvitations = invites.map((inv) => ({
      id: inv._id.toString(),
      invitedUser: inv.invitedUser
        ? {
            id: inv.invitedUser._id.toString(),
            name: inv.invitedUser.name,
            course: inv.invitedUser.course,
            year: inv.invitedUser.year,
          }
        : null,
      scoreSnapshot: inv.scoreSnapshot,
      expiresAt: inv.expiresAt,
      daysLeft: Math.max(
        0,
        Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      ),
    }));
  }

  return {
    _id: group._id.toString(),
    leaderId: group.leader.toString(),
    gender: group.gender,
    targetSize: group.targetSize,
    status: group.status,
    seatsFilled: group.members.length,
    seatsRemaining: Math.max(0, group.targetSize - group.members.length),
    averageScore: groupScores.average,
    lowestPairScore: groupScores.lowest,
    members: formattedMembers,
    pairScores: formattedPairs,
    pendingInvitations,
    myRole: isLeader ? "leader" : "member",
    completedAt: group.completedAt,
    lockedAt: group.lockedAt,
    createdAt: group.createdAt,
    roomPreferences: group.roomPreferences
      ? {
          preferredHostels: (group.roomPreferences.preferredHostels || []).map((h) => ({
            id: h._id ? h._id.toString() : h.toString(),
            name: h.name || "Hostel",
            code: h.code || "",
            gender: h.gender || "",
            totalFloors: h.totalFloors || 1,
          })),
          acType: group.roomPreferences.acType || "no-preference",
          floorPreference: group.roomPreferences.floorPreference || "any",
          updatedAt: group.roomPreferences.updatedAt || null,
        }
      : {
          preferredHostels: [],
          acType: "no-preference",
          floorPreference: "any",
          updatedAt: null,
        },
    preferencesNeedReview: Boolean(group.preferencesNeedReview),
  };
}

/**
 * Updates group target room size (leader only).
 * Automatically transitions group between "forming" and "complete".
 * 
 * @param {string} leaderId 
 * @param {number} newSize 
 * @returns {Promise<object>}
 */
export async function updateTargetSize(leaderId, newSize) {
  await connectDB();

  const parsedSize = Number(newSize);
  if (!GROUP_SIZE_OPTIONS.includes(parsedSize)) {
    throw new Error(`Target room size must be one of: [${GROUP_SIZE_OPTIONS.join(", ")}]`);
  }

  const group = await RoommateGroup.findOne({
    leader: leaderId,
    status: { $in: ["forming", "complete"] },
  });

  if (!group) {
    throw new Error("Active group not found or you are not the leader");
  }

  if (parsedSize < group.members.length) {
    throw new Error(
      `Cannot shrink target size to ${parsedSize}. Your group already has ${group.members.length} members.`
    );
  }

  group.targetSize = parsedSize;

  if (parsedSize === group.members.length) {
    group.status = "complete";
    group.completedAt = new Date();
    // Cancel remaining pending invitations
    await GroupInvitation.updateMany(
      { group: group._id, status: "pending" },
      { $set: { status: "cancelled" } }
    );
  } else {
    group.status = "forming";
    group.completedAt = null;
  }

  await group.save();

  // Update leader's allocation intent
  await AllocationIntent.findOneAndUpdate(
    { user: leaderId },
    { $set: { preferredRoomSize: parsedSize } }
  );

  return group;
}

/**
 * Evaluates candidate students that can be invited to the leader's group.
 * Strictly enforces canJoinGroup against ALL current group members.
 * 
 * @param {string} leaderId 
 * @param {object} [filters={}] 
 * @returns {Promise<object>}
 */
export async function getGroupCandidates(leaderId, filters = {}) {
  await connectDB();

  const {
    page = 1,
    limit = 20,
    minScore = 0,
    sameYearOnly = false,
    sharedLanguageOnly = false,
  } = filters;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const parsedMinScore = Math.max(0, Math.min(100, parseInt(minScore, 10) || 0));

  // 1. Verify leader and forming group
  const group = await RoommateGroup.findOne({
    leader: leaderId,
    status: "forming",
  }).lean();

  if (!group) {
    throw new Error("Forming roommate group not found or you are not the leader");
  }

  const freeSeats = group.targetSize - group.members.length;
  if (freeSeats <= 0) {
    return { candidates: [], total: 0, page: parsedPage, limit: parsedLimit, totalPages: 1 };
  }

  // 2. Load current members with preferences
  const memberUserIds = group.members.map((m) => m.user);
  const [memberUsers, memberPrefs, settings] = await Promise.all([
    User.find({ _id: { $in: memberUserIds } }).lean(),
    Preference.find({ student: { $in: memberUserIds } }).lean(),
    getSettings(),
  ]);

  const memberPrefMap = new Map();
  memberPrefs.forEach((p) => memberPrefMap.set(p.student.toString(), p));

  const currentMembers = memberUsers.map((u) => ({
    ...u,
    preferences: memberPrefMap.get(u._id.toString()) || {},
  }));

  // 3. Find IDs of students who are already unavailable
  // (already in an active group OR already have a pending invite from this group)
  const activeGroups = await RoommateGroup.find({
    status: { $in: ["forming", "complete", "locked"] },
  })
    .select("members.user")
    .lean();

  const unavailableIds = new Set();
  activeGroups.forEach((g) => {
    (g.members || []).forEach((m) => {
      if (m.user) unavailableIds.add(m.user.toString());
    });
  });

  // Students with pending invitations from this group
  const pendingInvites = await GroupInvitation.find({
    group: group._id,
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .select("invitedUser")
    .lean();

  pendingInvites.forEach((inv) => {
    if (inv.invitedUser) unavailableIds.add(inv.invitedUser.toString());
  });

  // 4. Query candidate users of the identical gender
  const candidateUsers = await User.find({
    role: "student",
    isActive: true,
    gender: group.gender,
    _id: { $nin: Array.from(unavailableIds) },
  })
    .select("name course department year gender")
    .lean();

  if (candidateUsers.length === 0) {
    return { candidates: [], total: 0, page: parsedPage, limit: parsedLimit, totalPages: 1 };
  }

  const candidateIds = candidateUsers.map((c) => c._id);
  const candidatePrefs = await Preference.find({
    student: { $in: candidateIds },
    completedAt: { $ne: null },
  }).lean();

  const candidatePrefMap = new Map();
  candidatePrefs.forEach((p) => candidatePrefMap.set(p.student.toString(), p));

  // 5. Evaluate canJoinGroup in memory
  const scoredCandidates = [];

  for (const user of candidateUsers) {
    const pref = candidatePrefMap.get(user._id.toString());
    if (!pref) continue;

    const candidateObj = { ...user, preferences: pref };

    const joinEval = canJoinGroup(
      candidateObj,
      currentMembers,
      settings.weights,
      MIN_PAIR_SCORE
    );

    if (!joinEval.allowed) continue;
    if (joinEval.average < parsedMinScore) continue;

    // Filter: Same Year Only (against leader)
    const leaderUser = currentMembers.find(
      (m) => m._id.toString() === group.leader.toString()
    );
    if (sameYearOnly && leaderUser && user.year !== leaderUser.year) {
      continue;
    }

    // Filter: Shared language with any member
    const candidateLangs = new Set((pref.languages || []).map((l) => l.toLowerCase()));
    const sharesLang = currentMembers.some((m) =>
      (m.preferences?.languages || []).some((l) => candidateLangs.has(l.toLowerCase()))
    );

    if (sharedLanguageOnly && !sharesLang) continue;

    // Per member scores with names
    const memberScores = joinEval.perMemberScores.map((ps) => ({
      memberName: currentMembers[ps.memberIndex]?.name || `Member ${ps.memberIndex + 1}`,
      score: ps.score,
      label: ps.label,
    }));

    scoredCandidates.push({
      candidate: formatPublicMember(user),
      groupAverage: joinEval.average,
      groupLowest: joinEval.lowest,
      perMemberScores: memberScores,
      sharedLanguages: (pref.languages || []).slice(0, 3),
    });
  }

  // Sort by groupAverage DESC, ties by groupLowest DESC, then candidate name ASC
  scoredCandidates.sort((a, b) => {
    if (b.groupAverage !== a.groupAverage) return b.groupAverage - a.groupAverage;
    if (b.groupLowest !== a.groupLowest) return b.groupLowest - a.groupLowest;
    return (a.candidate.name || "").localeCompare(b.candidate.name || "");
  });

  const total = scoredCandidates.length;
  const totalPages = Math.ceil(total / parsedLimit) || 1;
  const offset = (parsedPage - 1) * parsedLimit;
  const paginatedCandidates = scoredCandidates.slice(offset, offset + parsedLimit);

  return {
    candidates: paginatedCandidates,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages,
    freeSeats,
  };
}

/**
 * Sends an invitation from the group leader to an eligible student.
 * Re-validates all suitability rules on the server.
 * 
 * @param {string} leaderId 
 * @param {string} invitedUserId 
 * @returns {Promise<object>}
 */
export async function sendInvitation(leaderId, invitedUserId) {
  await connectDB();

  if (leaderId === invitedUserId) {
    throw new Error("You cannot invite yourself");
  }

  // 1. Verify forming group
  const group = await RoommateGroup.findOne({
    leader: leaderId,
    status: "forming",
  });

  if (!group) {
    throw new Error("Forming roommate group not found or you are not the leader");
  }

  const freeSeats = group.targetSize - group.members.length;
  if (freeSeats <= 0) {
    throw new Error("Your group is already full");
  }

  // 2. Check pending invitation buffer limit
  const activePendingCount = await GroupInvitation.countDocuments({
    group: group._id,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  const maxAllowedPending = freeSeats + PENDING_INVITE_BUFFER;
  if (activePendingCount >= maxAllowedPending) {
    throw new Error(
      `Pending invitations limit reached (${maxAllowedPending}). Wait for responses or cancel pending invitations.`
    );
  }

  // 3. Daily invitation limit check
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailySentCount = await GroupInvitation.countDocuments({
    invitedBy: leaderId,
    createdAt: { $gte: twentyFourHoursAgo },
  });

  if (dailySentCount >= MAX_INVITES_PER_STUDENT_PER_DAY) {
    throw new Error(
      `Daily invitation limit reached (${MAX_INVITES_PER_STUDENT_PER_DAY} invitations per 24 hours).`
    );
  }

  // 4. Verify candidate student
  const invitedUser = await User.findById(invitedUserId).lean();
  if (!invitedUser || invitedUser.role !== "student" || !invitedUser.isActive) {
    throw new Error("Invited student is not available");
  }

  if (invitedUser.gender !== group.gender) {
    throw new Error("Cannot invite students of different gender. Strict gender separation applies.");
  }

  const invitedPref = await Preference.findOne({ student: invitedUserId }).lean();
  if (!invitedPref || !invitedPref.completedAt) {
    throw new Error("Invited student has not completed their preferences questionnaire");
  }

  // Check candidate not already in an active group
  const candidateActiveGroup = await RoommateGroup.findOne({
    "members.user": invitedUserId,
    status: { $in: ["forming", "complete", "locked"] },
  }).lean();

  if (candidateActiveGroup) {
    throw new Error("Student is already a member of an active roommate group");
  }

  // Check no existing pending invitation
  const existingInvite = await GroupInvitation.findOne({
    group: group._id,
    invitedUser: invitedUserId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).lean();

  if (existingInvite) {
    throw new Error("An active invitation has already been sent to this student");
  }

  // 5. Server-side re-validation of canJoinGroup
  const memberUserIds = group.members.map((m) => m.user);
  const [memberUsers, memberPrefs, settings] = await Promise.all([
    User.find({ _id: { $in: memberUserIds } }).lean(),
    Preference.find({ student: { $in: memberUserIds } }).lean(),
    getSettings(),
  ]);

  const memberPrefMap = new Map();
  memberPrefs.forEach((p) => memberPrefMap.set(p.student.toString(), p));

  const currentMembers = memberUsers.map((u) => ({
    ...u,
    preferences: memberPrefMap.get(u._id.toString()) || {},
  }));

  const candidateObj = { ...invitedUser, preferences: invitedPref };
  const joinCheck = canJoinGroup(
    candidateObj,
    currentMembers,
    settings.weights,
    MIN_PAIR_SCORE
  );

  if (!joinCheck.allowed) {
    // Generic privacy-preserving message
    throw new Error("Candidate is not compatible with current group criteria");
  }

  // 6. Create invitation with expiry
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await GroupInvitation.create({
    group: group._id,
    invitedUser: invitedUserId,
    invitedBy: leaderId,
    status: "pending",
    expiresAt,
    scoreSnapshot: {
      average: joinCheck.average,
      lowest: joinCheck.lowest,
    },
  });

  return invitation;
}

/**
 * Cancels a pending outgoing invitation (leader only).
 * 
 * @param {string} leaderId 
 * @param {string} invitationId 
 * @returns {Promise<object>}
 */
export async function cancelInvitation(leaderId, invitationId) {
  await connectDB();

  const invitation = await GroupInvitation.findOne({
    _id: invitationId,
    invitedBy: leaderId,
    status: "pending",
  });

  if (!invitation) {
    throw new Error("Pending invitation not found or you are not authorized to cancel it");
  }

  invitation.status = "cancelled";
  invitation.respondedAt = new Date();
  await invitation.save();

  return invitation;
}

/**
 * Lists incoming invitations for the authenticated student.
 * Lazily expires overdue invitations before returning.
 * 
 * @param {string} userId 
 * @returns {Promise<{ pending: Array<object>, history: Array<object> }>}
 */
export async function listMyInvitations(userId) {
  await connectDB();

  // Lazy expiration of stale invitations
  await GroupInvitation.updateMany(
    { invitedUser: userId, status: "pending", expiresAt: { $lte: new Date() } },
    { $set: { status: "expired" } }
  );

  const invitations = await GroupInvitation.find({ invitedUser: userId })
    .populate({
      path: "group",
      select: "targetSize status members gender leader",
      populate: {
        path: "leader",
        select: "name course department year",
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  const pending = [];
  const history = [];

  for (const inv of invitations) {
    if (!inv.group) continue;

    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    const formattedInv = {
      id: inv._id.toString(),
      groupId: inv.group._id.toString(),
      leaderName: inv.group.leader?.name || "Group Leader",
      leaderCourse: inv.group.leader?.course || "",
      leaderYear: inv.group.leader?.year || null,
      targetSize: inv.group.targetSize,
      seatsFilled: inv.group.members?.length || 0,
      scoreSnapshot: inv.scoreSnapshot || { average: 0, lowest: 0 },
      expiresAt: inv.expiresAt,
      daysLeft,
      status: inv.status,
      createdAt: inv.createdAt,
    };

    if (inv.status === "pending" && inv.group.status === "forming") {
      pending.push(formattedInv);
    } else {
      history.push(formattedInv);
    }
  }

  return { pending, history };
}

/**
 * Accepts an invitation.
 * Uses atomic conditional update to guarantee that groups can NEVER be overfilled under concurrent requests.
 * 
 * @param {string} userId 
 * @param {string} invitationId 
 * @returns {Promise<object>}
 */
export async function acceptInvitation(userId, invitationId) {
  await connectDB();

  // 1. Lazy expire stale invitation
  await GroupInvitation.updateMany(
    { _id: invitationId, status: "pending", expiresAt: { $lte: new Date() } },
    { $set: { status: "expired" } }
  );

  const invitation = await GroupInvitation.findOne({
    _id: invitationId,
    invitedUser: userId,
    status: "pending",
  });

  if (!invitation) {
    throw new Error("Active invitation not found or already expired/handled");
  }

  // 2. Check user is not in an active group
  const existingGroup = await RoommateGroup.findOne({
    "members.user": userId,
    status: { $in: ["forming", "complete", "locked"] },
  }).lean();

  if (existingGroup) {
    throw new Error("You already belong to an active roommate group");
  }

  // 3. Verify group is still forming
  const group = await RoommateGroup.findById(invitation.group);
  if (!group || group.status !== "forming") {
    throw new Error("This roommate group is no longer forming or is already full");
  }

  // 4. Server-side compatibility check against current group composition
  const [candidateUser, candidatePref, memberUsers, memberPrefs, settings] =
    await Promise.all([
      User.findById(userId).lean(),
      Preference.findOne({ student: userId }).lean(),
      User.find({ _id: { $in: group.members.map((m) => m.user) } }).lean(),
      Preference.find({ student: { $in: group.members.map((m) => m.user) } }).lean(),
      getSettings(),
    ]);

  const memberPrefMap = new Map();
  memberPrefs.forEach((p) => memberPrefMap.set(p.student.toString(), p));

  const currentMembers = memberUsers.map((u) => ({
    ...u,
    preferences: memberPrefMap.get(u._id.toString()) || {},
  }));

  const candidateObj = { ...candidateUser, preferences: candidatePref || {} };
  const joinCheck = canJoinGroup(
    candidateObj,
    currentMembers,
    settings.weights,
    MIN_PAIR_SCORE
  );

  if (!joinCheck.allowed) {
    throw new Error("Your preferences conflict with one or more members of this group");
  }

  // 5. ATOMIC CONDITIONAL UPDATE:
  // Adds member ONLY if group is forming, user is not already present,
  // and current member count is strictly less than targetSize ($expr comparison).
  const updatedGroup = await RoommateGroup.findOneAndUpdate(
    {
      _id: group._id,
      status: "forming",
      "members.user": { $ne: userId },
      $expr: { $lt: [{ $size: "$members" }, "$targetSize"] },
    },
    {
      $push: { members: { user: userId, joinedAt: new Date() } },
    },
    { new: true }
  );

  if (!updatedGroup) {
    throw new Error("Group is full or another member took the last available seat");
  }

  // 6. Mark invitation accepted
  invitation.status = "accepted";
  invitation.respondedAt = new Date();
  await invitation.save();

  // 7. Cancel all other pending incoming invitations for this student
  await GroupInvitation.updateMany(
    { invitedUser: userId, status: "pending" },
    { $set: { status: "cancelled", respondedAt: new Date() } }
  );

  // 8. Recompute group scores with new member
  const allMemberUsers = await User.find({
    _id: { $in: updatedGroup.members.map((m) => m.user) },
  }).lean();
  const allMemberPrefs = await Preference.find({
    student: { $in: updatedGroup.members.map((m) => m.user) },
  }).lean();

  const allPrefMap = new Map();
  allMemberPrefs.forEach((p) => allPrefMap.set(p.student.toString(), p));

  const plainUpdatedMembers = allMemberUsers.map((u) => ({
    ...u,
    preferences: allPrefMap.get(u._id.toString()) || {},
  }));

  const groupScores = calculateGroupScore(plainUpdatedMembers, settings.weights);
  updatedGroup.averageScore = groupScores.average;
  updatedGroup.lowestPairScore = groupScores.lowest;

  // 9. If seats filled, transition to complete and cancel remaining group invites
  if (updatedGroup.members.length === updatedGroup.targetSize) {
    updatedGroup.status = "complete";
    updatedGroup.completedAt = new Date();

    await GroupInvitation.updateMany(
      { group: updatedGroup._id, status: "pending" },
      { $set: { status: "cancelled" } }
    );
  }

  await updatedGroup.save();

  // 10. Update student's allocation intent
  await AllocationIntent.findOneAndUpdate(
    { user: userId },
    { $set: { mode: "group", preferredRoomSize: updatedGroup.targetSize } },
    { upsert: true }
  );

  // 11. Re-validate room preferences against new group composition
  await revalidatePreferencesForGroup(updatedGroup._id);

  return updatedGroup;
}

/**
 * Declines an incoming invitation.
 * 
 * @param {string} userId 
 * @param {string} invitationId 
 * @returns {Promise<object>}
 */
export async function declineInvitation(userId, invitationId) {
  await connectDB();

  const invitation = await GroupInvitation.findOne({
    _id: invitationId,
    invitedUser: userId,
    status: "pending",
  });

  if (!invitation) {
    throw new Error("Active invitation not found");
  }

  invitation.status = "declined";
  invitation.respondedAt = new Date();
  await invitation.save();

  return invitation;
}

/**
 * Removes the authenticated student from their current group.
 * If leader leaves and others remain, leadership passes to earliest joined member.
 * If last member leaves, group is disbanded.
 * 
 * @param {string} userId 
 * @returns {Promise<object>}
 */
export async function leaveGroup(userId) {
  await connectDB();

  const group = await RoommateGroup.findOne({
    "members.user": userId,
    status: { $in: ["forming", "complete", "locked"] },
  });

  if (!group) {
    throw new Error("You are not currently in an active group");
  }

  if (group.status === "locked") {
    throw new Error("Cannot leave a locked group. Room allocation has already been finalized.");
  }

  // If student was the only member, disband
  if (group.members.length <= 1) {
    group.status = "disbanded";
    group.disbandedAt = new Date();
    await GroupInvitation.updateMany(
      { group: group._id, status: "pending" },
      { $set: { status: "cancelled" } }
    );
    await group.save();
    return { status: "disbanded" };
  }

  // Remove student from members array
  group.members = group.members.filter((m) => m.user.toString() !== userId.toString());

  // If leader is leaving, transfer leadership to earliest joined member
  if (group.leader.toString() === userId.toString()) {
    group.members.sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
    group.leader = group.members[0].user;
  }

  // If group was complete, revert to forming
  if (group.status === "complete") {
    group.status = "forming";
    group.completedAt = null;
  }

  // Recompute scores for remaining members
  const settings = await getSettings();
  const [users, prefs] = await Promise.all([
    User.find({ _id: { $in: group.members.map((m) => m.user) } }).lean(),
    Preference.find({ student: { $in: group.members.map((m) => m.user) } }).lean(),
  ]);
  const pMap = new Map();
  prefs.forEach((p) => pMap.set(p.student.toString(), p));
  const remaining = users.map((u) => ({ ...u, preferences: pMap.get(u._id.toString()) || {} }));

  const scores = calculateGroupScore(remaining, settings.weights);
  group.averageScore = scores.average;
  group.lowestPairScore = scores.lowest;

  await group.save();
  await revalidatePreferencesForGroup(group._id);
  return { status: group.status, leader: group.leader };
}

/**
 * Removes a member from the group (leader only).
 * 
 * @param {string} leaderId 
 * @param {string} memberId 
 * @returns {Promise<object>}
 */
export async function removeMember(leaderId, memberId) {
  await connectDB();

  if (leaderId === memberId) {
    throw new Error("Leader cannot remove themselves. Use Leave Group or Disband instead.");
  }

  const group = await RoommateGroup.findOne({
    leader: leaderId,
    status: { $in: ["forming", "complete"] },
  });

  if (!group) {
    throw new Error("Active group not found or you are not the leader");
  }

  const memberExists = group.members.some((m) => m.user.toString() === memberId.toString());
  if (!memberExists) {
    throw new Error("Target student is not a member of this group");
  }

  group.members = group.members.filter((m) => m.user.toString() !== memberId.toString());

  if (group.status === "complete") {
    group.status = "forming";
    group.completedAt = null;
  }

  // Recompute scores
  const settings = await getSettings();
  const [users, prefs] = await Promise.all([
    User.find({ _id: { $in: group.members.map((m) => m.user) } }).lean(),
    Preference.find({ student: { $in: group.members.map((m) => m.user) } }).lean(),
  ]);
  const pMap = new Map();
  prefs.forEach((p) => pMap.set(p.student.toString(), p));
  const remaining = users.map((u) => ({ ...u, preferences: pMap.get(u._id.toString()) || {} }));

  const scores = calculateGroupScore(remaining, settings.weights);
  group.averageScore = scores.average;
  group.lowestPairScore = scores.lowest;

  await group.save();
  await revalidatePreferencesForGroup(group._id);
  return group;
}

/**
 * Disbands an active group (leader only).
 * 
 * @param {string} leaderId 
 * @returns {Promise<object>}
 */
export async function disbandGroup(leaderId) {
  await connectDB();

  const group = await RoommateGroup.findOne({
    leader: leaderId,
    status: { $in: ["forming", "complete"] },
  });

  if (!group) {
    throw new Error("Active group not found or you are not the leader");
  }

  group.status = "disbanded";
  group.disbandedAt = new Date();

  await GroupInvitation.updateMany(
    { group: group._id, status: "pending" },
    { $set: { status: "cancelled" } }
  );

  await group.save();
  return group;
}

/**
 * Retrieves student's allocation intent.
 * 
 * @param {string} userId 
 * @returns {Promise<object>}
 */
export async function getIntent(userId) {
  await connectDB();
  const intent = await AllocationIntent.findOne({ user: userId }).lean();
  return intent || { mode: "group", preferredRoomSize: 2 };
}

/**
 * Sets student's allocation intent ("group" vs "auto").
 * Cannot switch to "auto" while member of an active group.
 * 
 * @param {string} userId 
 * @param {{ mode: "group"|"auto", preferredRoomSize: number }} data 
 * @returns {Promise<object>}
 */
export async function setIntent(userId, data) {
  await connectDB();
  const { mode, preferredRoomSize } = data;

  if (mode === "auto") {
    const activeGroup = await RoommateGroup.findOne({
      "members.user": userId,
      status: { $in: ["forming", "complete", "locked"] },
    }).lean();

    if (activeGroup) {
      throw new Error(
        "Cannot switch to auto-assign while belonging to an active roommate group. Please leave your group first."
      );
    }
  }

  const updatedIntent = await AllocationIntent.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        mode,
        preferredRoomSize: Number(preferredRoomSize) || 2,
      },
    },
    { upsert: true, new: true }
  ).lean();

  return updatedIntent;
}

/**
 * Administrative: Lists groups with filters and pagination.
 */
export async function adminListGroups(filters = {}, pagination = {}) {
  await connectDB();

  const { status, targetSize, gender, search, isDemo } = filters;
  const { page = 1, limit = 20 } = pagination;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const query = {};
  if (status) query.status = status;
  if (targetSize) query.targetSize = Number(targetSize);
  if (gender) query.gender = gender;
  if (isDemo !== undefined && isDemo !== null && isDemo !== "") {
    query.isDemo = isDemo === "true";
  }

  // If search query is provided, match member names or registration numbers
  if (search) {
    const matchedUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { registrationNumber: { $regex: search, $options: "i" } },
      ],
    }).select("_id");
    const matchedIds = matchedUsers.map((u) => u._id);
    query["members.user"] = { $in: matchedIds };
  }

  const [groups, total] = await Promise.all([
    RoommateGroup.find(query)
      .populate("leader", "name email registrationNumber")
      .populate("members.user", "name registrationNumber course department year")
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    RoommateGroup.countDocuments(query),
  ]);

  return {
    groups,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(total / parsedLimit) || 1,
  };
}

/**
 * Administrative: Retrieves a single group with full diagnostics and member details.
 */
export async function adminGetGroup(id) {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid group ID format");
  }

  const group = await RoommateGroup.findById(id)
    .populate("leader", "name email registrationNumber gender")
    .populate("members.user", "name email registrationNumber course department year gender")
    .populate("roomPreferences.preferredHostels", "name code gender totalFloors facilities allowedYears")
    .lean();

  if (!group) throw new Error("Roommate group not found");

  const memberIds = group.members.map((m) => m.user?._id).filter(Boolean);
  const [prefs, settings] = await Promise.all([
    Preference.find({ student: { $in: memberIds } }).lean(),
    getSettings(),
  ]);

  const pMap = new Map();
  prefs.forEach((p) => pMap.set(p.student.toString(), p));

  const membersWithPrefs = group.members.map((m) => ({
    ...(m.user || {}),
    preferences: pMap.get(m.user?._id?.toString()) || {},
  }));

  const groupScores = calculateGroupScore(membersWithPrefs, settings.weights);

  return {
    ...group,
    pairScores: groupScores.pairs.map((p) => ({
      memberA: group.members[p.a]?.user?.name || "Member",
      memberB: group.members[p.b]?.user?.name || "Member",
      score: p.score,
      label: p.label,
      excluded: p.excluded,
      violations: p.violations || [],
    })),
  };
}

/**
 * Administrative: Removes member from a group.
 */
export async function adminRemoveMember(groupId, userId) {
  await connectDB();

  const group = await RoommateGroup.findById(groupId);
  if (!group) throw new Error("Group not found");
  if (group.status === "locked") {
    throw new Error("Cannot modify a locked group. The room allocation must be cancelled first.");
  }

  return removeMember(group.leader.toString(), userId);
}

/**
 * Administrative: Disbands a group.
 */
export async function adminDisbandGroup(groupId) {
  await connectDB();

  const group = await RoommateGroup.findById(groupId);
  if (!group) throw new Error("Group not found");
  if (group.status === "locked") {
    throw new Error("Cannot disband a locked group. The room allocation must be cancelled first.");
  }

  group.status = "disbanded";
  group.disbandedAt = new Date();

  await GroupInvitation.updateMany(
    { group: group._id, status: "pending" },
    { $set: { status: "cancelled" } }
  );

  await group.save();
  return group;
}

/**
 * Administrative: Computes live metrics for group dashboard widgets.
 */
export async function getGroupStats() {
  await connectDB();

  const [
    forming,
    complete,
    locked,
    disbanded,
    activeGroupDocs,
    autoIntentCount,
    totalCompletedPrefs,
  ] = await Promise.all([
    RoommateGroup.countDocuments({ status: "forming" }),
    RoommateGroup.countDocuments({ status: "complete" }),
    RoommateGroup.countDocuments({ status: "locked" }),
    RoommateGroup.countDocuments({ status: "disbanded" }),
    RoommateGroup.find({ status: { $in: ["forming", "complete", "locked"] } }).select("members.user").lean(),
    AllocationIntent.countDocuments({ mode: "auto" }),
    Preference.countDocuments({ completedAt: { $ne: null } }),
  ]);

  const studentsInGroupsSet = new Set();
  activeGroupDocs.forEach((g) => {
    (g.members || []).forEach((m) => {
      if (m.user) studentsInGroupsSet.add(m.user.toString());
    });
  });

  const studentsInGroups = studentsInGroupsSet.size;
  const studentsUngrouped = Math.max(0, totalCompletedPrefs - studentsInGroups - autoIntentCount);

  return {
    forming,
    complete,
    locked,
    disbanded,
    studentsInGroups,
    studentsInAutoPool: autoIntentCount,
    studentsUngrouped,
  };
}
