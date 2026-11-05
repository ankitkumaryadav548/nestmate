"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import {
  PageContainer,
  Card,
  Badge,
  Button,
  Avatar,
  ConfirmDialog,
  Alert,
  InfoRow,
} from "@/components/ui";
import { AdminPageHeader } from "@/components/admin";
import { DEAL_BREAKER_OPTIONS } from "@/config/questionnaire";
import useDocumentTitle from "@/hooks/useDocumentTitle";

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
  useDocumentTitle(studentData?.user?.name || "Student Details", true);
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
      <PageContainer maxWidth="5xl" className="py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error || !studentData) {
    return (
      <PageContainer maxWidth="5xl" className="py-8">
        <Alert
          variant="danger"
          title="Could not find student"
          action={
            <Button variant="outline" size="sm" onClick={fetchStudent}>
              Try again
            </Button>
          }
        >
          {error || "Student does not exist or has been removed."}
        </Alert>
        <div className="mt-4">
          <Link href="/admin/students">
            <Button variant="secondary" size="sm">
              &larr; Back to Students Directory
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const { user, profile, preferences, group, allocation } = studentData;
  const isPreferencesCompleted = Boolean(preferences?.completedAt);

  return (
    <PageContainer maxWidth="5xl" className="py-8">
      {/* Header */}
      <AdminPageHeader
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>{user.name}</span>
            {user.isDemo && (
              <Badge variant="warning" size="sm">
                DEMO STUDENT
              </Badge>
            )}
            <Badge variant={user.isActive ? "success" : "danger"} size="sm" dot>
              {user.isActive ? "Active Account" : "Deactivated"}
            </Badge>
          </div>
        }
        description={`${user.registrationNumber || "No Reg No"} • ${user.email} • ${user.gender || "Gender unassigned"}`}
        breadcrumbs={[
          { href: "/admin/students", label: "Students" },
          { label: user.name },
        ]}
        actions={
          <Button
            type="button"
            variant={user.isActive ? "danger" : "primary"}
            size="sm"
            onClick={() => setIsConfirmOpen(true)}
          >
            {user.isActive ? "Deactivate Account" : "Activate Account"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Academic & Origin Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Academic Details */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading border-b border-slate-100 dark:border-slate-800 pb-3">
              Academic Details
            </h2>
            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <InfoRow label="Course" value={user.course || "Not specified"} />
              <InfoRow label="Department" value={user.department || "Not specified"} />
              <InfoRow label="Year of Study" value={user.year ? `Year ${user.year}` : "—"} />
              <InfoRow label="Contact Phone" value={user.phone || "—"} />
            </div>
          </Card>

          {/* Regional Origin & Arrival */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                Origin &amp; Arrival
              </h2>
              {profile?.isInternational ? (
                <Badge variant="brand" size="xs">
                  International
                </Badge>
              ) : (
                <Badge variant="neutral" size="xs">
                  Domestic (India)
                </Badge>
              )}
            </div>

            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <InfoRow label="Home Country" value={profile?.homeCountry || "India"} />
              <InfoRow label="Home State" value={profile?.homeState || "—"} />
              {profile?.isInternational && (
                <>
                  <InfoRow label="Time Zone" value={profile?.timeZone || "—"} />
                  <InfoRow
                    label="Expected Arrival"
                    value={
                      profile?.expectedArrivalDate
                        ? new Date(profile.expectedArrivalDate).toLocaleDateString()
                        : "—"
                    }
                  />
                </>
              )}
            </div>
          </Card>

          {/* Emergency Contacts */}
          {profile?.emergencyContact && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading border-b border-slate-100 dark:border-slate-800 pb-3">
                Emergency Contact
              </h2>
              <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <InfoRow label="Name" value={profile.emergencyContact.name || "—"} />
                <InfoRow label="Relation" value={profile.emergencyContact.relationship || "—"} />
                <InfoRow label="Phone" value={profile.emergencyContact.phone || "—"} />
              </div>
            </Card>
          )}

          {/* Group & Room Status */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading border-b border-slate-100 dark:border-slate-800 pb-3">
              Placement Status
            </h2>
            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <InfoRow
                label="Roommate Group"
                value={
                  group ? (
                    <Link
                      href={`/admin/groups/${group._id}`}
                      className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {group.name || `Group #${group._id?.slice(-4)}`} &rarr;
                    </Link>
                  ) : (
                    "Not in group"
                  )
                }
              />
              <InfoRow
                label="Room Allocation"
                value={
                  allocation ? (
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      {allocation.hostel?.code} #{allocation.room?.roomNumber}
                    </span>
                  ) : (
                    "Unallocated"
                  )
                }
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Lifestyle Questionnaire & Deal-Breakers */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                  Lifestyle Preferences
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Self-declared questionnaire habits used for compatibility ranking.
                </p>
              </div>

              {isPreferencesCompleted ? (
                <Badge variant="success" size="sm" dot>
                  Completed
                </Badge>
              ) : (
                <Badge variant="warning" size="sm" dot>
                  Pending Submission
                </Badge>
              )}
            </div>

            {isPreferencesCompleted ? (
              <div className="space-y-6">
                {/* Desired Room Size */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      Target Room Size
                    </span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                      {preferences.roomSize === 1
                        ? "Single Room (1 Bed - No Roommates)"
                        : `${preferences.roomSize}-Bed Room (Roommates Required)`}
                    </span>
                  </div>
                  <Badge variant="brand" size="md">
                    {preferences.roomSize || 1} Bed
                  </Badge>
                </div>

                {/* Routine Habits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/30">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Sleep Schedule
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                      {SLEEP_LABELS[preferences.sleepSchedule] || preferences.sleepSchedule || "—"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/30">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Study Hours
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                      {STUDY_LABELS[preferences.studyTime] || preferences.studyTime || "—"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/30">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Late Night Calls
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                      {CALL_LABELS[preferences.nightCalls] || preferences.nightCalls || "—"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/30">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Diet / Food Preference
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                      {FOOD_LABELS[preferences.food] || preferences.food || "—"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/30">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      AC Preference
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                      {AC_LABELS[preferences.acPreference] || preferences.acPreference || "—"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/30">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Spoken Languages
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                      {preferences.languages?.length > 0
                        ? preferences.languages.join(", ")
                        : "None declared"}
                    </span>
                  </div>
                </div>

                {/* 1-5 Numerical Scales */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      Cleanliness
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1 block">
                      {preferences.cleanliness || 0} / 5
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      Noise Tolerance
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1 block">
                      {preferences.noiseTolerance || 0} / 5
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      Social Level
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1 block">
                      {preferences.socialLevel || 0} / 5
                    </span>
                  </div>
                </div>

                {/* Strict Deal-Breakers Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                    Active Deal-Breakers
                  </h3>

                  {preferences.dealBreakers?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {preferences.dealBreakers.map((dbKey) => (
                        <Badge key={dbKey} variant="danger" size="md">
                          ⛔ {DEAL_BREAKER_OPTIONS?.find((d) => d.id === dbKey)?.label || dbKey}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No strict deal-breakers specified by this student.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                Student has not submitted their lifestyle questionnaire yet.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={user.isActive ? "Deactivate Student Account?" : "Activate Student Account?"}
        message={
          user.isActive
            ? `Are you sure you want to deactivate ${user.name}? The student will lose access to the portal.`
            : `Are you sure you want to activate ${user.name}? The student will regain access to their portal.`
        }
        confirmText={user.isActive ? "Deactivate" : "Activate"}
        variant={user.isActive ? "danger" : "primary"}
        isLoading={toggling}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmToggle}
      />
    </PageContainer>
  );
}
