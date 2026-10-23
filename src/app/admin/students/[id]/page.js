"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DEAL_BREAKER_OPTIONS } from "@/config/questionnaire";

const SLEEP_LABELS = {
  early: "Early to Bed (Usually before 10:00 PM)",
  normal: "Normal Hours (10:00 PM - 12:00 AM)",
  late: "Night Owl (Usually after 12:00 AM midnight)",
};

const STUDY_LABELS = {
  morning: "Morning Person (Dawn to midday focus)",
  daytime: "Daytime (Afternoon & early evening)",
  night: "Late Night (Quiet midnight hours)",
  flexible: "Flexible (Adapts easily to schedule changes)",
};

const CALL_LABELS = {
  never: "Rarely or Never (Avoids late calls in shared room)",
  sometimes: "Occasionally (A few times a week / brief calls)",
  often: "Frequently (Regular late-night calls / other time zone)",
};

const FOOD_LABELS = {
  veg: "Vegetarian (Plant-based, dairy permitted)",
  "non-veg": "Non-Vegetarian (Includes poultry, meat, and seafood)",
  eggetarian: "Eggetarian (Vegetarian inclusive of eggs)",
  halal: "Halal Non-Vegetarian (Strictly Halal guidelines)",
  jain: "Jain Vegetarian (Strict vegetarian without root crops)",
};

const AC_LABELS = {
  ac: "Air Conditioned (AC Room required)",
  "non-ac": "Non-AC (Ventilated / Fan only)",
  "no-preference": "No Preference (Either AC or Non-AC)",
};

const CULTURAL_LABELS = {
  "open-to-all": "Open to All (Eager to live with anyone from any background)",
  "prefer-similar-background": "Prefer Familiar (Slight comfort preference for familiar cultural region)",
  "no-preference": "No Preference",
};

export default function AdminStudentDetailPage({ params }) {
  const unwrappedParams = use(params);
  const studentId = unwrappedParams.id;

  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status toggle confirmation
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchStudent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`/api/admin/students/${studentId}`);
      if (res.data?.success) {
        setStudentData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load student detail:", err);
      setError(err.response?.data?.message || "Failed to load student details");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  const handleConfirmToggle = async () => {
    if (!studentData?.user) return;
    try {
      setToggling(true);
      const newStatus = !studentData.user.isActive;
      const res = await axios.patch(`/api/admin/students/${studentId}`, {
        isActive: newStatus,
      });
      if (res.data?.success) {
        setStudentData((prev) => ({
          ...prev,
          user: { ...prev.user, isActive: newStatus },
        }));
        setIsConfirmOpen(false);
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
      alert(err.response?.data?.message || "Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 py-12 px-4 max-w-5xl mx-auto w-full animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 rounded w-1/4"></div>
        <div className="h-10 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-100 rounded-2xl"></div>
          <div className="h-64 bg-slate-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !studentData) {
    return (
      <div className="flex-1 py-12 px-4 max-w-5xl mx-auto w-full">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
          <h2 className="text-base font-bold">Could not find student</h2>
          <p className="text-xs text-rose-600 mt-1">{error || "Student does not exist or has been removed."}</p>
          <div className="mt-4">
            <Link
              href="/admin/students"
              className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              &larr; Back to Students Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { user, profile, preferences } = studentData;
  const isPreferencesCompleted = Boolean(preferences?.completedAt);

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      {/* Navigation & Header */}
      <div className="mb-6">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          &larr; Back to Student Directory
        </Link>
      </div>

      <div className="mb-8 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 text-xl font-black">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{user.name}</h1>
                {user.isDemo && (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    DEMO STUDENT
                  </span>
                )}
                {user.isActive ? (
                  <Badge variant="success" size="sm">Active Account</Badge>
                ) : (
                  <Badge variant="danger" size="sm">Deactivated</Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-mono font-semibold text-indigo-600">{user.registrationNumber || "No Reg No"}</span>
                <span>•</span>
                <span>{user.email}</span>
                <span>•</span>
                <span className="capitalize">{user.gender || "Gender unassigned"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                user.isActive
                  ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {user.isActive ? "Deactivate Account" : "Activate Account"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Academic & Origin Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Academic Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Academic Details
            </h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div>
                <dt className="text-slate-500 font-medium">Course</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{user.course || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Department</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{user.department || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Year of Study</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{user.year ? `Year ${user.year}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Contact Phone</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{user.phone || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Regional Origin & Arrival */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Origin & Arrival</span>
              {profile.isInternational ? (
                <span className="rounded bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-bold">
                  International
                </span>
              ) : (
                <span className="rounded bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold">
                  Domestic (India)
                </span>
              )}
            </h2>

            <dl className="mt-4 space-y-3 text-xs">
              <div>
                <dt className="text-slate-500 font-medium">Home Country</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{profile.homeCountry || "India"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Home State / Province</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{profile.homeState || "—"}</dd>
              </div>
              {profile.isInternational && (
                <>
                  <div>
                    <dt className="text-slate-500 font-medium">Home Time Zone</dt>
                    <dd className="text-slate-900 font-semibold mt-0.5">{profile.homeTimeZone || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Expected Arrival Date</dt>
                    <dd className="text-slate-900 font-semibold mt-0.5">
                      {profile.arrivalDate ? new Date(profile.arrivalDate).toLocaleDateString() : "Not scheduled"}
                    </dd>
                  </div>
                </>
              )}
              {profile.emergencyContactName && (
                <div className="pt-2 border-t border-slate-100">
                  <dt className="text-slate-500 font-medium">Emergency Contact</dt>
                  <dd className="text-slate-900 font-semibold mt-0.5">
                    {profile.emergencyContactName} ({profile.emergencyContactPhone || "No phone"})
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Right Column: Lifestyle Questionnaire & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Lifestyle Questionnaire Responses</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Used by the matching algorithm to suggest high-compatibility room pairings.
                </p>
              </div>
              {isPreferencesCompleted ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                  ✓ Completed ({new Date(preferences.completedAt).toLocaleDateString()})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                  ⏳ Questionnaire Pending
                </span>
              )}
            </div>

            {/* Questions Grid */}
            <div className="space-y-6 text-xs sm:text-sm">
              {/* Daily routine */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
                  Daily Routine
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="font-medium text-slate-500">Sleep Schedule:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {SLEEP_LABELS[preferences.sleepSchedule] || "Not answered"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Preferred Study Time:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {STUDY_LABELS[preferences.studyTime] || "Not answered"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium text-slate-500">Late-Night Phone Calls:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {CALL_LABELS[preferences.nightCalls] || "Not answered"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Living habits */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
                  Living Habits & Environment
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="font-medium text-slate-500">Cleanliness:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {preferences.cleanliness ? `${preferences.cleanliness} / 5` : "Not rated"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Noise Tolerance:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {preferences.noiseTolerance ? `${preferences.noiseTolerance} / 5` : "Not rated"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Social Visitors:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {preferences.socialLevel ? `${preferences.socialLevel} / 5` : "Not rated"}
                    </p>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="font-medium text-slate-500">AC Preference:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {AC_LABELS[preferences.acPreference] || "No preference"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Food & Languages */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
                  Dietary & Languages
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="font-medium text-slate-500">Dietary Lifestyle:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {FOOD_LABELS[preferences.foodType] || "Not answered"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Dietary Sharing Comfort:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {preferences.okWithDifferentFood === true
                        ? "Comfortable sharing with different diets"
                        : preferences.okWithDifferentFood === false
                        ? "Prefers roommate with same diet"
                        : "Not specified"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium text-slate-500">Spoken Languages:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {Array.isArray(preferences.languages) && preferences.languages.length > 0 ? (
                        preferences.languages.map((l) => (
                          <span
                            key={l}
                            className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700"
                          >
                            {l}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">None declared</span>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium text-slate-500">Cultural Background Comfort:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {CULTURAL_LABELS[preferences.culturalComfort] || "No preference"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Deal Breakers */}
              <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
                  Strict Deal-Breakers (Constraints)
                </span>
                {Array.isArray(preferences.dealBreakers) && preferences.dealBreakers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {preferences.dealBreakers.map((key) => {
                      const db = DEAL_BREAKER_OPTIONS.find((d) => d.key === key);
                      return (
                        <div
                          key={key}
                          className="rounded-xl bg-white border border-rose-200 p-3 shadow-xs"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                            <span>{db?.icon || "🛡️"}</span>
                            <span>{db?.label || key}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">{db?.description}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No deal-breakers selected. Open to maximum roommate compatibility.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmToggle}
        title={user.isActive ? "Deactivate Student?" : "Activate Student?"}
        message={
          user.isActive
            ? `Are you sure you want to deactivate ${user.name}? They will lose portal access.`
            : `Are you sure you want to activate ${user.name}? They will regain full portal access.`
        }
        confirmText={user.isActive ? "Deactivate" : "Activate"}
        variant={user.isActive ? "danger" : "primary"}
        isLoading={toggling}
      />
    </div>
  );
}
