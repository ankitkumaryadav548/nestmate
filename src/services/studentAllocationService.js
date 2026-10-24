/**
 * Student Room Allocation Service (Phase 6 - "My Room" Portal)
 * 
 * Provides safe, authenticated student views into room placement outcomes.
 * 
 * STRICT PRIVACY & PHONE SAFEGUARDS:
 * - A student sees ONLY roommates residing in their own active room of a PUBLISHED run.
 * - NEVER leaks email, registration number, raw survey responses, or deal-breaker choices.
 * - PHONE RULE: Roommate's phone number is returned if and only if:
 *   1. The viewer has an active allocation in the same room.
 *   2. The roommate has sharePhoneWithRoommates set to true on their StudentProfile.
 *   3. The roommate has an existing phone number saved.
 *   Otherwise, returns null and a descriptive phoneStatus ("not_provided" | "hidden_by_student").
 */

import connectDB from "../lib/db.js";
import Allocation from "../models/Allocation.js";
import AllocationRun from "../models/AllocationRun.js";
import AllocationAssignment from "../models/AllocationAssignment.js";
import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import Preference from "../models/Preference.js";
import RoommateGroup from "../models/RoommateGroup.js";
import { WAITLIST_REASONS, UNALLOCATED_REASONS } from "../config/allocation.js";
import { getScoreLabel } from "../config/matching.js";
import { calculateCompatibility } from "./matching/scoreEngine.js";
import { getSharedLanguages } from "./matching/scoreEngine.js";

/**
 * Retrieves the authenticated student's finalized room allocation status.
 * 
 * @param {string} userId - Authenticated student user ID
 * @returns {Promise<object>}
 */
export async function getMyAllocation(userId) {
  await connectDB();

  // 1. Check for an ACTIVE published Allocation
  const activeAllocation = await Allocation.findOne({
    student: userId,
    status: "active",
  })
    .populate("hostel")
    .populate("room")
    .populate("group")
    .lean();

  if (activeAllocation && activeAllocation.room && activeAllocation.hostel) {
    const roomId = activeAllocation.room._id;

    // Find all co-occupants in the same room with active allocations
    const coAllocations = await Allocation.find({
      room: roomId,
      status: "active",
      student: { $ne: userId },
    })
      .select("student allocatedAt")
      .lean();

    const roommateStudentIds = coAllocations.map((a) => a.student);

    // Fetch roommate users, profiles, and preferences in parallel lean queries
    const [viewerUser, viewerPref, roommateUsers, roommateProfiles, roommatePrefs] = await Promise.all([
      User.findById(userId).select("gender year").lean(),
      Preference.findOne({ student: userId }).lean(),
      User.find({ _id: { $in: roommateStudentIds } })
        .select("name course department year phone")
        .lean(),
      StudentProfile.find({ user: { $in: roommateStudentIds } })
        .select("user sharePhoneWithRoommates")
        .lean(),
      Preference.find({ student: { $in: roommateStudentIds } }).lean(),
    ]);

    const profileMap = new Map();
    roommateProfiles.forEach((p) => profileMap.set(String(p.user), p));

    const prefMap = new Map();
    roommatePrefs.forEach((p) => prefMap.set(String(p.student), p));

    const viewerStudentObj = {
      id: String(userId),
      _id: userId,
      gender: viewerUser?.gender || "male",
      year: viewerUser?.year || 1,
      preferences: viewerPref?.preferences || viewerPref || {},
    };

    // Format safe roommate cards
    const roommates = roommateUsers.map((rUser) => {
      const rId = String(rUser._id);
      const rPref = prefMap.get(rId) || {};
      const rProfile = profileMap.get(rId);

      const rStudentObj = {
        id: rId,
        _id: rUser._id,
        name: rUser.name,
        gender: viewerStudentObj.gender,
        year: rUser.year || 1,
        preferences: rPref.preferences || rPref,
      };

      // Compatibility calculation using standard weights
      const comp = calculateCompatibility(viewerStudentObj, rStudentObj);
      const label = getScoreLabel(comp.score);

      // Extract shared languages
      const viewerLangs = viewerPref?.preferences?.languages || viewerPref?.languages || [];
      const roommateLangs = rPref?.preferences?.languages || rPref?.languages || [];
      const sharedLanguages = getSharedLanguages(viewerLangs, roommateLangs);

      /**
       * PHONE RULE ENFORCEMENT:
       * Only share roommate's phone if:
       * 1. The viewer has an active allocation in the same room (verified above).
       * 2. The roommate has sharePhoneWithRoommates === true (default true).
       * 3. The roommate has a non-empty phone saved.
       */
      let phone = null;
      let phoneStatus = "hidden_by_student";

      if (!rUser.phone || rUser.phone.trim() === "") {
        phoneStatus = "not_provided";
      } else if (rProfile && rProfile.sharePhoneWithRoommates === false) {
        phoneStatus = "hidden_by_student";
      } else {
        phone = rUser.phone.trim();
        phoneStatus = "shared";
      }

      return {
        name: rUser.name,
        course: rUser.course || "Not specified",
        department: rUser.department || "",
        year: rUser.year || null,
        sharedLanguages,
        compatibilityScore: comp.score,
        compatibilityLabel: label,
        phone,
        phoneStatus,
      };
    });

    const groupAverage = activeAllocation.group?.averageScore || 100;

    return {
      status: "allocated",
      allocatedAt: activeAllocation.allocatedAt,
      hostel: {
        name: activeAllocation.hostel.name,
        code: activeAllocation.hostel.code,
        location: activeAllocation.hostel.location || "",
        facilities: activeAllocation.hostel.facilities || [],
        rules: activeAllocation.hostel.rules || [],
      },
      room: {
        roomNumber: activeAllocation.room.roomNumber,
        floor: activeAllocation.room.floor,
        roomType: activeAllocation.room.roomType,
        capacity: activeAllocation.room.capacity,
      },
      roommates,
      groupAverage,
    };
  }

  // 2. Not actively allocated: Check latest PUBLISHED run for waitlist or unallocated status
  const latestPublishedRun = await AllocationRun.findOne({ status: "published" })
    .sort({ publishedAt: -1 })
    .lean();

  if (latestPublishedRun) {
    // Check if student is waitlisted in this published run
    const waitlistedAssignment = await AllocationAssignment.findOne({
      run: latestPublishedRun._id,
      members: userId,
      status: "waitlisted",
    }).lean();

    if (waitlistedAssignment) {
      const reasonCode = waitlistedAssignment.waitlistReason || "all_matching_rooms_taken";
      const reasonConfig = WAITLIST_REASONS[reasonCode];
      return {
        status: "waitlisted",
        reason: reasonConfig ? reasonConfig.label : "Rooms currently filled by priority",
        description: reasonConfig ? reasonConfig.description : "You are on the hostel waitlist.",
        publishedAt: latestPublishedRun.publishedAt,
      };
    }

    // Check if student was unallocated in this published run
    const unallocatedEntry = (latestPublishedRun.unallocated || []).find(
      (u) => String(u.user) === String(userId)
    );

    if (unallocatedEntry) {
      const reasonCode = unallocatedEntry.reason || "preferences_incomplete";
      const reasonConfig = UNALLOCATED_REASONS[reasonCode];
      let nextStep = "Check back during future allocation rounds.";
      if (reasonCode === "preferences_incomplete") {
        nextStep = "Complete your roommate lifestyle questionnaire in your profile.";
      }
      return {
        status: "not_allocated",
        reason: reasonConfig ? reasonConfig.label : "Not allocated",
        description: reasonConfig ? reasonConfig.description : "",
        nextStep,
        publishedAt: latestPublishedRun.publishedAt,
      };
    }
  }

  // 3. Otherwise: pending publication
  return {
    status: "pending",
    message: "Hostel room allocation has not been published yet.",
  };
}
