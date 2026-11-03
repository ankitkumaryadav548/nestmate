import connectDB from "../lib/db.js";
import User from "../models/User.js";
import Preference from "../models/Preference.js";
import MatchingSettings from "../models/MatchingSettings.js";
import RoommateGroup from "../models/RoommateGroup.js";
import Allocation from "../models/Allocation.js";
import {
  DEFAULT_WEIGHTS,
  YEAR_BONUS,
  ENGINE_VERSION,
} from "../config/matching.js";
import { calculateCompatibility } from "./matching/scoreEngine.js";

/**
 * FAIRNESS & NON-DISCRIMINATION POLICY:
 * In accordance with institutional guidelines, roommate matching operates solely on voluntary lifestyle
 * answers (sleep routine, study hours, noise, tidiness, food preferences, guest comfort, and spoken languages).
 * Demographic fields such as nationality, home state, home country, or ethnicity are strictly barred
 * from candidate filtering and compatibility scoring algorithms.
 */

/**
 * Retrieves active matching algorithm settings from database or fallback to defaults.
 * 
 * @returns {Promise<{ weights: object, yearBonus: object, updatedBy: string|null, updatedAt: Date|null }>}
 */
export async function getSettings() {
  await connectDB();
  const settingsDoc = await MatchingSettings.findOne().lean();

  if (!settingsDoc) {
    return {
      weights: { ...DEFAULT_WEIGHTS },
      yearBonus: { ...YEAR_BONUS },
      updatedBy: null,
      updatedAt: null,
      isDefault: true,
    };
  }

  return {
    weights: {
      ...DEFAULT_WEIGHTS,
      ...(settingsDoc.weights || {}),
    },
    yearBonus: {
      ...YEAR_BONUS,
      ...(settingsDoc.yearBonus || {}),
    },
    updatedBy: settingsDoc.updatedBy,
    updatedAt: settingsDoc.updatedAt,
    isDefault: false,
  };
}

/**
 * Updates matching algorithm weights and bonus points.
 * Validates that weights sum to exactly 100.
 * 
 * @param {string} adminId 
 * @param {{ weights: object, yearBonus?: object }} data 
 * @returns {Promise<object>}
 */
export async function updateSettings(adminId, data) {
  await connectDB();
  const { weights, yearBonus } = data;

  if (!weights || typeof weights !== "object") {
    throw new Error("Weights configuration is required");
  }

  const requiredKeys = [
    "sleepSchedule",
    "studyTime",
    "cleanliness",
    "noiseTolerance",
    "foodType",
    "socialLevel",
    "languageAndCalls",
  ];

  let sum = 0;
  const sanitizedWeights = {};
  for (const key of requiredKeys) {
    const val = Number(weights[key]);
    if (isNaN(val) || val < 0 || val > 100) {
      throw new Error(`Invalid weight for ${key}: must be between 0 and 100`);
    }
    sanitizedWeights[key] = Math.round(val);
    sum += sanitizedWeights[key];
  }

  if (sum !== 100) {
    throw new Error(`Total weights must equal exactly 100%. Current sum: ${sum}%`);
  }

  const sanitizedYearBonus = {
    sameYear: Number(yearBonus?.sameYear ?? YEAR_BONUS.sameYear),
    oneYearApart: Number(yearBonus?.oneYearApart ?? YEAR_BONUS.oneYearApart),
    otherwise: Number(yearBonus?.otherwise ?? YEAR_BONUS.otherwise),
  };

  const updatedDoc = await MatchingSettings.findOneAndUpdate(
    {},
    {
      $set: {
        weights: sanitizedWeights,
        yearBonus: sanitizedYearBonus,
        updatedBy: adminId,
      },
    },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  return {
    weights: updatedDoc.weights,
    yearBonus: updatedDoc.yearBonus,
    updatedBy: updatedDoc.updatedBy,
    updatedAt: updatedDoc.updatedAt,
  };
}

/**
 * Resets matching settings to institutional defaults.
 * 
 * @param {string} adminId 
 * @returns {Promise<object>}
 */
export async function resetSettings(adminId) {
  await connectDB();
  const resetDoc = await MatchingSettings.findOneAndUpdate(
    {},
    {
      $set: {
        weights: { ...DEFAULT_WEIGHTS },
        yearBonus: { ...YEAR_BONUS },
        updatedBy: adminId,
      },
    },
    { new: true, upsert: true }
  ).lean();

  return {
    weights: resetDoc.weights,
    yearBonus: resetDoc.yearBonus,
    updatedBy: resetDoc.updatedBy,
    updatedAt: resetDoc.updatedAt,
  };
}

/**
 * Hook function for unavailable student IDs.
 *
 * Excludes students who are in a COMPLETE or LOCKED group — their group is
 * already full / room-assigned and they are no longer looking for a roommate.
 *
 * Students in a FORMING group are still actively seeking roommates (the
 * leader may still invite others) and must remain visible in the discovery
 * pool so that other leaders can find and invite them.
 *
 * Additionally excludes any student who already has an active published
 * room allocation.
 *
 * @returns {Promise<string[]>}
 */
export async function getUnavailableStudentIds() {
  await connectDB();
  // Only exclude complete / locked groups — forming groups are still open
  const closedGroups = await RoommateGroup.find({
    status: { $in: ["complete", "locked"] },
  })
    .select("members.user")
    .lean();

  const userIds = new Set();
  for (const group of closedGroups) {
    for (const m of group.members || []) {
      if (m.user) {
        userIds.add(m.user.toString());
      }
    }
  }

  // Also exclude students with an active published room allocation

  const activeAllocations = await Allocation.find({ status: "active" })
    .select("student")
    .lean();
  for (const a of activeAllocations) {
    if (a.student) {
      userIds.add(a.student.toString());
    }
  }

  return Array.from(userIds);
}

/**
 * Retrieves candidate pool eligible to match with a given student.
 * 
 * HARD CONSTRAINTS:
 * 1. Must be registered students (role === 'student' and isActive === true).
 * 2. Same gender strictly required ("male" with "male", "female" with "female", "other" with "other").
 * 3. Both the student and candidate must have completed their lifestyle questionnaire (completedAt !== null).
 * 4. Must not be the student themself or unavailable.
 * 
 * PERFORMANCE:
 * Uses two indexed lean queries (User and Preference) to avoid N+1 queries.
 * 
 * @param {string} studentId 
 * @returns {Promise<{ student: object, candidates: Array<object> }>}
 */
export async function getEligibleCandidates(studentId) {
  await connectDB();

  // 1. Fetch current student and preference
  const student = await User.findById(studentId).lean();
  if (!student || student.role !== "student") {
    throw new Error("Student record not found");
  }

  const studentPref = await Preference.findOne({ student: studentId }).lean();
  if (!studentPref || !studentPref.completedAt || !studentPref.roomSize) {
    const error = new Error("Complete your preferences first");
    error.code = "PREFERENCES_INCOMPLETE";
    throw error;
  }

  student.preferences = studentPref;

  // Single room student needs no roommates
  if (studentPref.roomSize === 1) {
    return { student, candidates: [], singleRoom: true };
  }

  // 2. Fetch unavailable student IDs (hook)
  const unavailableIds = await getUnavailableStudentIds();
  const excludeIds = [student._id, ...unavailableIds];

  // 3. Query candidate pool of the same gender
  const candidateUsers = await User.find({
    role: "student",
    isActive: true,
    gender: student.gender,
    _id: { $nin: excludeIds },
  })
    .select("name course department year gender registrationNumber")
    .lean();

  if (candidateUsers.length === 0) {
    return { student, candidates: [] };
  }

  const candidateUserIds = candidateUsers.map((u) => u._id);

  // 4. Query only candidates with completed preferences and matching roomSize
  const candidatePrefs = await Preference.find({
    student: { $in: candidateUserIds },
    completedAt: { $ne: null },
    roomSize: studentPref.roomSize,
  }).lean();

  const prefMap = new Map();
  for (const p of candidatePrefs) {
    prefMap.set(p.student.toString(), p);
  }

  // 5. Merge user + preference
  const eligibleCandidates = [];
  for (const user of candidateUsers) {
    const pref = prefMap.get(user._id.toString());
    if (pref && pref.roomSize === studentPref.roomSize) {
      eligibleCandidates.push({
        ...user,
        preferences: pref,
      });
    }
  }

  return { student, candidates: eligibleCandidates };
}

/**
 * Formats a student candidate into a safe public profile representation for peers.
 * NEVER exposes email, phone, registration number, raw preference answers, or location data.
 * 
 * @param {object} candidate 
 * @param {object} result - Output of calculateCompatibility
 * @returns {object}
 */
export function formatPublicCandidate(candidate, result) {
  return {
    id: candidate._id.toString(),
    name: candidate.name,
    course: candidate.course || "Not specified",
    department: candidate.department || "",
    year: candidate.year || null,
    score: result.score,
    baseScore: result.baseScore,
    yearBonus: result.yearBonus,
    label: result.label,
    breakdown: result.breakdown,
    reasons: result.reasons,
    warnings: result.warnings,
    sharedLanguages: result.sharedLanguages,
  };
}

/**
 * Evaluates in-memory compatibility for all eligible candidates and returns paginated top matches.
 * 
 * IN-MEMORY SCALING NOTE:
 * Evaluating 300 - 3,000 candidates takes ~2ms to ~15ms in pure V8 memory, making it lightning fast.
 * For massive campus populations (50,000+), this can be extended with a Redis cache or precomputed index.
 * 
 * @param {string} studentId 
 * @param {object} filters 
 * @returns {Promise<object>}
 */
export async function getTopMatches(studentId, filters = {}) {
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

  // Check if student is already in an active group
  await connectDB();
  const activeGroup = await RoommateGroup.findOne({
    "members.user": studentId,
    status: { $in: ["forming", "complete", "locked"] },
  }).lean();

  let leaderGroup = null;
  if (activeGroup) {
    const isLeader = activeGroup.leader.toString() === studentId.toString();
    // Non-leader members, or members of complete/locked groups see a status banner instead of candidate list
    if (activeGroup.status === "complete" || activeGroup.status === "locked" || !isLeader) {
      return {
        matches: [],
        total: 0,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: 1,
        studentGender: null,
        groupStatusBanner: {
          inGroup: true,
          status: activeGroup.status,
          isLeader,
          targetSize: activeGroup.targetSize,
          membersCount: activeGroup.members.length,
          groupId: activeGroup._id.toString(),
        },
      };
    }

    // Leader of forming group
    leaderGroup = {
      id: activeGroup._id.toString(),
      targetSize: activeGroup.targetSize,
      membersCount: activeGroup.members.length,
      freeSeats: activeGroup.targetSize - activeGroup.members.length,
    };
  }

  const settings = await getSettings();
  const eligibleResult = await getEligibleCandidates(studentId);
  if (eligibleResult.singleRoom) {
    return {
      matches: [],
      total: 0,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: 1,
      studentGender: eligibleResult.student?.gender || null,
      singleRoom: true,
      leaderGroup: null,
      settingsUsed: {
        engineVersion: ENGINE_VERSION,
        weights: settings.weights,
      },
    };
  }

  const { student, candidates } = eligibleResult;

  const matches = [];

  for (const candidate of candidates) {
    const result = calculateCompatibility(student, candidate, settings.weights, {
      yearBonus: settings.yearBonus,
    });

    // Discard pairs with conflicting deal-breakers
    if (result.excluded) continue;

    // Filter: minimum score threshold
    if (result.score < parsedMinScore) continue;

    // Filter: same academic year only
    if (sameYearOnly && candidate.year !== student.year) continue;

    // Filter: shared language only
    if (sharedLanguageOnly && result.sharedLanguages.length === 0) continue;

    matches.push({
      candidate,
      result,
    });
  }

  // Deterministic sorting:
  // 1. Highest score first
  // 2. Same academic year cohort tie-breaker
  // 3. Alphabetical name tie-breaker
  matches.sort((a, b) => {
    if (b.result.score !== a.result.score) {
      return b.result.score - a.result.score;
    }
    const aSameYear = a.candidate.year === student.year ? 1 : 0;
    const bSameYear = b.candidate.year === student.year ? 1 : 0;
    if (bSameYear !== aSameYear) {
      return bSameYear - aSameYear;
    }
    return (a.candidate.name || "").localeCompare(b.candidate.name || "");
  });

  const total = matches.length;
  const totalPages = Math.ceil(total / parsedLimit) || 1;
  const offset = (parsedPage - 1) * parsedLimit;
  const paginatedItems = matches.slice(offset, offset + parsedLimit);

  const pageCandidateIds = paginatedItems.map(({ candidate }) => candidate._id);
  const candidateGroups = await RoommateGroup.find({
    "members.user": { $in: pageCandidateIds },
    status: "forming",
  }).lean();

  const groupByUser = new Map();
  for (const g of candidateGroups) {
    if (
      g.gender === student.gender &&
      g.targetSize === student.preferences?.roomSize &&
      g.members.length < g.targetSize
    ) {
      for (const m of g.members) {
        groupByUser.set(m.user.toString(), {
          groupId: g._id.toString(),
          filledSeats: g.members.length,
          targetSize: g.targetSize,
        });
      }
    }
  }

  const formattedMatches = paginatedItems.map(({ candidate, result }) => {
    const formatted = formatPublicCandidate(candidate, result);
    const inGroup = groupByUser.get(candidate._id.toString()) || null;
    if (inGroup) {
      formatted.inGroup = inGroup;
    }
    return formatted;
  });

  return {
    matches: formattedMatches,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages,
    studentGender: student.gender,
    leaderGroup,
    settingsUsed: {
      engineVersion: ENGINE_VERSION,
      weights: settings.weights,
    },
  };
}

/**
 * Evaluates pairing between two specific students.
 * 
 * If requested by a student (!forAdmin):
 * - Confirms both are active and same gender.
 * - If excluded by deal-breaker or incomplete, returns generic "Not available" without leaking deal-breaker details.
 * 
 * If requested by an administrator (forAdmin):
 * - Returns diagnostic logs, deal-breaker violations, and admin-safe student summaries.
 * 
 * @param {string} studentIdA 
 * @param {string} studentIdB 
 * @param {{ forAdmin?: boolean }} options 
 * @returns {Promise<object>}
 */
export async function getPairResult(studentIdA, studentIdB, options = {}) {
  const { forAdmin = false } = options;
  await connectDB();

  const [studentA, studentB] = await Promise.all([
    User.findById(studentIdA).lean(),
    User.findById(studentIdB).lean(),
  ]);

  if (!studentA || !studentB) {
    return {
      eligible: false,
      notFound: true,
      message: "One or both students could not be found",
    };
  }

  const [prefA, prefB] = await Promise.all([
    Preference.findOne({ student: studentIdA }).lean(),
    Preference.findOne({ student: studentIdB }).lean(),
  ]);

  // Gender isolation validation
  if (studentA.gender !== studentB.gender) {
    if (forAdmin) {
      return {
        eligible: false,
        reason: "GENDER_MISMATCH",
        message: `Different genders (${studentA.gender} vs ${studentB.gender}). Institutional policy restricts room allocation to students of identical gender.`,
        studentA: formatAdminStudent(studentA),
        studentB: formatAdminStudent(studentB),
      };
    }
    return { eligible: false, message: "Not available" };
  }

  // Questionnaire completion check
  if (!prefA?.completedAt || !prefB?.completedAt || !prefA?.roomSize || !prefB?.roomSize) {
    if (forAdmin) {
      return {
        eligible: false,
        reason: "INCOMPLETE_PREFERENCES",
        message: "One or both students have not completed their lifestyle questionnaire",
        studentACompleted: Boolean(prefA?.completedAt && prefA?.roomSize),
        studentBCompleted: Boolean(prefB?.completedAt && prefB?.roomSize),
        studentA: formatAdminStudent(studentA),
        studentB: formatAdminStudent(studentB),
      };
    }
    return { eligible: false, message: "Not available" };
  }

  // Room size compatibility check
  const hasDiffRoomSize =
    prefA.roomSize !== prefB.roomSize ||
    prefA.roomSize === 1 ||
    prefB.roomSize === 1;

  if (hasDiffRoomSize && !forAdmin) {
    return { eligible: false, message: "Not available" };
  }

  studentA.preferences = prefA;
  studentB.preferences = prefB;

  const settings = await getSettings();
  const result = calculateCompatibility(studentA, studentB, settings.weights, {
    yearBonus: settings.yearBonus,
  });

  if (result.excluded) {
    if (forAdmin) {
      return {
        eligible: false,
        excluded: true,
        violations: result.violations,
        message: "Pair excluded due to conflicting non-negotiable deal-breaker criteria.",
        studentA: formatAdminStudent(studentA),
        studentB: formatAdminStudent(studentB),
        breakdown: result.breakdown,
        sharedLanguages: result.sharedLanguages,
        ...(hasDiffRoomSize
          ? {
              roomSizeMismatch: true,
              note: "Different room size, these two would not be matched in practice",
            }
          : {}),
      };
    }
    return { eligible: false, message: "Not available" };
  }

  if (forAdmin) {
    return {
      eligible: true,
      ...result,
      studentA: formatAdminStudent(studentA),
      studentB: formatAdminStudent(studentB),
      ...(hasDiffRoomSize
        ? {
            roomSizeMismatch: true,
            note: "Different room size, these two would not be matched in practice",
          }
        : {}),
    };
  }

  return {
    eligible: true,
    candidate: formatPublicCandidate(studentB, result),
  };
}

/**
 * Admin tool: Fetches top compatible matches for any specific student.
 * 
 * @param {string} studentId 
 * @param {number} [limit=10] 
 * @returns {Promise<object>}
 */
export async function getAdminStudentTopMatches(studentId, limit = 10) {
  const result = await getTopMatches(studentId, {
    page: 1,
    limit,
    minScore: 0,
  });
  return result;
}

function formatAdminStudent(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    registrationNumber: user.registrationNumber || "N/A",
    gender: user.gender,
    year: user.year,
    course: user.course,
    department: user.department,
  };
}
