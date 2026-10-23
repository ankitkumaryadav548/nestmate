import mongoose from "mongoose";
import User from "@/models/User";
import StudentProfile from "@/models/StudentProfile";
import Preference from "@/models/Preference";
import { QUESTIONS } from "@/config/questionnaire";

/**
 * Validates whether all required profile fields have been provided.
 * Required: course, department, year, phone, homeCountry, and homeState (for domestic students).
 */
function isProfileComplete(user, profile) {
  const hasCourse = Boolean(user?.course?.trim());
  const hasDepartment = Boolean(user?.department?.trim());
  const hasYear = typeof user?.year === "number" && user.year >= 1;
  const hasPhone = Boolean(user?.phone?.trim());
  const hasCountry = Boolean(profile?.homeCountry?.trim());
  const hasState = profile?.isInternational || Boolean(profile?.homeState?.trim());

  return hasCourse && hasDepartment && hasYear && hasPhone && hasCountry && hasState;
}

/**
 * Validates whether all mandatory questionnaire answers are populated.
 */
function arePreferencesComplete(prefData) {
  if (!prefData) return false;

  const requiredKeys = [
    "sleepSchedule",
    "studyTime",
    "cleanliness",
    "noiseTolerance",
    "socialLevel",
    "foodType",
    "okWithDifferentFood",
    "acPreference",
    "nightCalls",
    "languages",
  ];

  for (const key of requiredKeys) {
    const val = prefData[key];
    if (val === undefined || val === null || val === "") {
      return false;
    }
    if (key === "languages") {
      if (!Array.isArray(val) || val.length === 0) {
        return false;
      }
    }
    if (key === "cleanliness" || key === "noiseTolerance" || key === "socialLevel") {
      if (typeof val !== "number" || val < 1 || val > 5) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Fetches the student profile along with the core User details.
 */
export async function getProfile(userId) {
  const user = await User.findById(userId).select("-password -__v");
  if (!user) {
    throw new Error("Student user not found");
  }

  let profile = await StudentProfile.findOne({ user: userId });
  if (!profile) {
    profile = await StudentProfile.create({
      user: userId,
      homeCountry: "India",
      isInternational: false,
      homeTimeZone: "Asia/Kolkata",
    });
  }

  return {
    user,
    profile,
  };
}

/**
 * Upserts the student profile and syncs core academic/contact details on the User model.
 */
export async function upsertProfile(userId, data) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Student user not found");
  }

  // Update user fields if provided
  if (data.course !== undefined) user.course = data.course.trim();
  if (data.department !== undefined) user.department = data.department.trim();
  if (data.year !== undefined) user.year = data.year === null || data.year === "" ? null : Number(data.year);
  if (data.phone !== undefined) user.phone = data.phone.trim();
  await user.save();

  // Find or create profile
  let profile = await StudentProfile.findOne({ user: userId });
  if (!profile) {
    profile = new StudentProfile({ user: userId });
  }

  if (data.homeState !== undefined) profile.homeState = data.homeState.trim();
  if (data.homeCountry !== undefined) profile.homeCountry = data.homeCountry.trim();
  if (data.isInternational !== undefined) profile.isInternational = Boolean(data.isInternational);
  if (data.homeTimeZone !== undefined) profile.homeTimeZone = data.homeTimeZone.trim();
  if (data.arrivalDate !== undefined) profile.arrivalDate = data.arrivalDate ? new Date(data.arrivalDate) : null;
  if (data.emergencyContactName !== undefined) profile.emergencyContactName = data.emergencyContactName.trim();
  if (data.emergencyContactPhone !== undefined) profile.emergencyContactPhone = data.emergencyContactPhone.trim();

  // Determine completion status
  if (isProfileComplete(user, profile)) {
    profile.profileCompletedAt = profile.profileCompletedAt || new Date();
  } else {
    profile.profileCompletedAt = null;
  }

  await profile.save();

  return {
    user: user.toObject(),
    profile: profile.toObject(),
  };
}

/**
 * Retrieves the preference questionnaire record for a student.
 */
export async function getPreferences(userId) {
  let preference = await Preference.findOne({ student: userId });
  if (!preference) {
    preference = await Preference.create({
      student: userId,
      dealBreakers: [],
      languages: [],
    });
  }
  return preference;
}

/**
 * Upserts preference questionnaire answers and checks completion.
 */
export async function upsertPreferences(userId, data) {
  let preference = await Preference.findOne({ student: userId });
  if (!preference) {
    preference = new Preference({ student: userId });
  }

  // Update fields
  if (data.sleepSchedule !== undefined) preference.sleepSchedule = data.sleepSchedule;
  if (data.studyTime !== undefined) preference.studyTime = data.studyTime;
  if (data.nightCalls !== undefined) preference.nightCalls = data.nightCalls;
  if (data.cleanliness !== undefined) preference.cleanliness = Number(data.cleanliness);
  if (data.noiseTolerance !== undefined) preference.noiseTolerance = Number(data.noiseTolerance);
  if (data.socialLevel !== undefined) preference.socialLevel = Number(data.socialLevel);
  if (data.acPreference !== undefined) preference.acPreference = data.acPreference;
  if (data.foodType !== undefined) preference.foodType = data.foodType;
  if (data.okWithDifferentFood !== undefined) preference.okWithDifferentFood = Boolean(data.okWithDifferentFood);
  if (data.languages !== undefined) {
    preference.languages = Array.isArray(data.languages)
      ? Array.from(new Set(data.languages.map((l) => l.trim()).filter(Boolean)))
      : [];
  }
  if (data.culturalComfort !== undefined) preference.culturalComfort = data.culturalComfort;
  if (data.dealBreakers !== undefined) {
    preference.dealBreakers = Array.isArray(data.dealBreakers)
      ? Array.from(new Set(data.dealBreakers.filter(Boolean)))
      : [];
  }

  // Check completion
  if (arePreferencesComplete(preference)) {
    preference.completedAt = preference.completedAt || new Date();
  } else {
    preference.completedAt = null;
  }

  await preference.save();
  return preference.toObject();
}

/**
 * Computes profile and preferences completion status for the student dashboard.
 */
export async function getCompletionStatus(userId) {
  const user = await User.findById(userId).select("course department year phone");
  const profile = await StudentProfile.findOne({ user: userId });
  const preference = await Preference.findOne({ student: userId });

  const profileDone = Boolean(user && profile && isProfileComplete(user, profile));
  const prefDone = Boolean(preference && preference.completedAt !== null && arePreferencesComplete(preference));

  let percentage = 0;
  if (profileDone && prefDone) {
    percentage = 100;
  } else if (profileDone || prefDone) {
    percentage = 50;
  } else {
    // Check if partial answers exist
    let partialScore = 0;
    if (user?.course || user?.phone) partialScore += 15;
    if (preference?.sleepSchedule || preference?.foodType) partialScore += 15;
    percentage = partialScore;
  }

  return {
    profileCompleted: profileDone,
    preferencesCompleted: prefDone,
    percentage,
  };
}

/**
 * Lists students for administrative oversight using MongoDB aggregation pipelines
 * to avoid N+1 queries by joining User, StudentProfile, and Preference in a single pass.
 */
export async function listStudents(filters = {}, pagination = {}) {
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 10));
  const skip = (page - 1) * limit;

  // Initial match on User model
  const matchUser = { role: "student" };

  if (filters.isActive !== undefined && filters.isActive !== "") {
    matchUser.isActive = filters.isActive === "true" || filters.isActive === true;
  }

  if (filters.isDemo !== undefined && filters.isDemo !== "") {
    matchUser.isDemo = filters.isDemo === "true" || filters.isDemo === true;
  }

  if (filters.gender && filters.gender !== "all") {
    matchUser.gender = filters.gender;
  }

  if (filters.year && filters.year !== "all") {
    matchUser.year = Number(filters.year);
  }

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    const regex = new RegExp(term, "i");
    matchUser.$or = [
      { name: regex },
      { email: regex },
      { registrationNumber: regex },
    ];
  }

  const pipeline = [
    { $match: matchUser },
    // Join StudentProfile
    {
      $lookup: {
        from: "studentprofiles",
        localField: "_id",
        foreignField: "user",
        as: "profileDoc",
      },
    },
    {
      $unwind: {
        path: "$profileDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Join Preference
    {
      $lookup: {
        from: "preferences",
        localField: "_id",
        foreignField: "student",
        as: "prefDoc",
      },
    },
    {
      $unwind: {
        path: "$prefDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  // Apply post-lookup filters on profile / preference if specified
  const matchPost = {};
  if (filters.isInternational !== undefined && filters.isInternational !== "" && filters.isInternational !== "all") {
    matchPost["profileDoc.isInternational"] = filters.isInternational === "true" || filters.isInternational === true;
  }

  if (filters.preferencesCompleted !== undefined && filters.preferencesCompleted !== "" && filters.preferencesCompleted !== "all") {
    const isCompleted = filters.preferencesCompleted === "true" || filters.preferencesCompleted === true;
    if (isCompleted) {
      matchPost["prefDoc.completedAt"] = { $ne: null };
    } else {
      matchPost.$or = [
        { prefDoc: { $exists: false } },
        { "prefDoc.completedAt": null },
      ];
    }
  }

  if (Object.keys(matchPost).length > 0) {
    pipeline.push({ $match: matchPost });
  }

  // Count total matches using facet
  const facetPipeline = [
    ...pipeline,
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              name: 1,
              email: 1,
              role: 1,
              gender: 1,
              registrationNumber: 1,
              phone: 1,
              course: 1,
              department: 1,
              year: 1,
              isActive: 1,
              isDemo: 1,
              createdAt: 1,
              profile: {
                homeState: "$profileDoc.homeState",
                homeCountry: "$profileDoc.homeCountry",
                isInternational: "$profileDoc.isInternational",
                homeTimeZone: "$profileDoc.homeTimeZone",
                arrivalDate: "$profileDoc.arrivalDate",
                emergencyContactName: "$profileDoc.emergencyContactName",
                emergencyContactPhone: "$profileDoc.emergencyContactPhone",
                profileCompletedAt: "$profileDoc.profileCompletedAt",
              },
              preferences: {
                completedAt: "$prefDoc.completedAt",
                sleepSchedule: "$prefDoc.sleepSchedule",
                studyTime: "$prefDoc.studyTime",
                cleanliness: "$prefDoc.cleanliness",
                noiseTolerance: "$prefDoc.noiseTolerance",
                socialLevel: "$prefDoc.socialLevel",
                foodType: "$prefDoc.foodType",
                okWithDifferentFood: "$prefDoc.okWithDifferentFood",
                acPreference: "$prefDoc.acPreference",
                nightCalls: "$prefDoc.nightCalls",
                languages: "$prefDoc.languages",
                culturalComfort: "$prefDoc.culturalComfort",
                dealBreakers: "$prefDoc.dealBreakers",
              },
            },
          },
        ],
      },
    },
  ];

  const results = await User.aggregate(facetPipeline);
  const total = results[0]?.metadata[0]?.total || 0;
  const students = results[0]?.data || [];

  return {
    students,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves a single student's complete details (User + Profile + Preferences) for admin inspection.
 */
export async function getStudentById(studentId) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return null;
  }

  const user = await User.findOne({ _id: studentId, role: "student" }).select("-password -__v");
  if (!user) {
    return null;
  }

  let profile = await StudentProfile.findOne({ user: studentId }).select("-__v");
  if (!profile) {
    profile = {
      homeCountry: "India",
      homeState: "",
      isInternational: false,
      homeTimeZone: "Asia/Kolkata",
      arrivalDate: null,
      emergencyContactName: "",
      emergencyContactPhone: "",
      profileCompletedAt: null,
    };
  }

  let preference = await Preference.findOne({ student: studentId }).select("-__v");
  if (!preference) {
    preference = {
      completedAt: null,
      dealBreakers: [],
      languages: [],
    };
  }

  return {
    user: user.toObject ? user.toObject() : user,
    profile: profile.toObject ? profile.toObject() : profile,
    preferences: preference.toObject ? preference.toObject() : preference,
  };
}

/**
 * Toggles a student's active status (Admin only).
 * Crucially, role and password cannot be modified here.
 */
export async function toggleStudentActive(studentId, isActive) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error("Invalid student ID");
  }

  const student = await User.findOne({ _id: studentId, role: "student" });
  if (!student) {
    throw new Error("Student not found");
  }

  student.isActive = Boolean(isActive);
  await student.save();

  return student.toObject();
}
