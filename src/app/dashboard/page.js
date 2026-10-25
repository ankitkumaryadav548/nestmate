"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [status, setStatus] = useState({
    profileCompleted: false,
    preferencesCompleted: false,
    percentage: 0,
  });
  const [groupInfo, setGroupInfo] = useState(null);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [allocation, setAllocation] = useState(null);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingStatus(true);
        const [statusRes, groupRes, invRes, allocRes, notifRes] = await Promise.all([
          axios.get("/api/students/me/status").catch(() => ({ data: { data: null } })),
          axios.get("/api/groups/me").catch(() => ({ data: { data: null } })),
          axios.get("/api/invitations/me").catch(() => ({ data: { data: null } })),
          axios.get("/api/allocation/me").catch(() => ({ data: { data: null } })),
          axios.get("/api/notifications?limit=3").catch(() => ({ data: { data: null } })),
        ]);
        if (statusRes.data?.data) setStatus(statusRes.data.data);
        if (groupRes.data?.data) setGroupInfo(groupRes.data.data);
        if (invRes.data?.data?.pending) setPendingInvitesCount(invRes.data.data.pending.length);
        if (allocRes.data?.data) setAllocation(allocRes.data.data);
        if (notifRes.data?.data?.notifications) setRecentNotifications(notifRes.data.data.notifications);
      } catch (err) {
        console.error("Failed to load student status:", err);
      } finally {
        setLoadingStatus(false);
      }
    }
    loadData();
  }, []);

  const hasIncompleteSteps = !status.profileCompleted || !status.preferencesCompleted;

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Incomplete Checklist Reminder Banner */}
      {!loadingStatus && hasIncompleteSteps && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-amber-900 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Action Required: Complete Your Roommate Matching Profile
                </h3>
                <p className="text-xs text-amber-800 mt-0.5 max-w-2xl leading-relaxed">
                  Before the automated roommate allocation run begins, ensure both your personal academic profile and
                  lifestyle questionnaire are confirmed. Incomplete profiles cannot be prioritized for preferred room types.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!status.profileCompleted && (
                <Link
                  href="/dashboard/profile"
                  className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors"
                >
                  Complete Profile &rarr;
                </Link>
              )}
              {!status.preferencesCompleted && (
                <Link
                  href="/dashboard/preferences"
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  Fill Questionnaire &rarr;
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Room Allocated Highlight Banner */}
      {allocation?.status === "allocated" && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 text-emerald-950 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg shadow-sm">
                🎉
              </span>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Room Allocation Published: Room #{allocation.room?.roomNumber} ({allocation.hostel?.name})
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Your hostel room has been officially allocated. View room specifications and connect with your assigned roommates.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/room"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors shrink-0"
            >
              View My Room &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 p-8 text-white shadow-xl shadow-indigo-500/20 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white mb-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              Student Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.name || "Student"}!
            </h1>
            <p className="mt-1 text-sm text-indigo-100 max-w-xl">
              Track your residential status, configure roommate preferences, and check live hostel inventory.
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <div className="shrink-0 rounded-xl bg-white/10 border border-white/20 p-3 text-center backdrop-blur-md">
              <span className="block text-[10px] uppercase tracking-wider text-indigo-200">Registration No</span>
              <span className="text-sm font-mono font-bold text-white">
                {user?.registrationNumber || "N/A"}
              </span>
            </div>
            <Link
              href="/dashboard/hostels"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-indigo-700 shadow-md hover:bg-indigo-50 transition-all"
            >
              🏢 Browse Hostels &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Profile & Application Completion Progress */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Roommate Matching Readiness</h2>
            <p className="text-xs text-slate-500">Your profile and questionnaire completion score</p>
          </div>
          <span className="text-sm font-extrabold text-indigo-600">
            {loadingStatus ? "..." : `${status.percentage}% Ready`}
          </span>
        </div>

        {/* Progress track */}
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              status.percentage === 100 ? "bg-emerald-500" : "bg-indigo-600"
            }`}
            style={{ width: `${status.percentage}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2">
              <span>{status.profileCompleted ? "✅" : "⏳"}</span>
              <span className="font-semibold text-slate-700">Student Profile</span>
            </div>
            <Link
              href="/dashboard/profile"
              className="text-indigo-600 font-bold hover:underline"
            >
              {status.profileCompleted ? "Review &rarr;" : "Complete &rarr;"}
            </Link>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2">
              <span>{status.preferencesCompleted ? "✅" : "⏳"}</span>
              <span className="font-semibold text-slate-700">Lifestyle Questionnaire</span>
            </div>
            <Link
              href="/dashboard/preferences"
              className="text-indigo-600 font-bold hover:underline"
            >
              {status.preferencesCompleted ? "Review &rarr;" : "Fill Questionnaire &rarr;"}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Student Profile Card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Profile Overview</h2>
              {status.profileCompleted ? (
                <Badge variant="success" size="sm">Complete</Badge>
              ) : (
                <Badge variant="warning" size="sm">Incomplete</Badge>
              )}
            </div>

            <dl className="mt-4 space-y-3.5 text-xs sm:text-sm">
              <div>
                <dt className="text-slate-500 font-medium">Full Name</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{user?.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Institutional Email</dt>
                <dd className="text-slate-900 font-semibold mt-0.5 break-all">{user?.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Gender</dt>
                <dd className="text-slate-900 font-semibold capitalize mt-0.5">{user?.gender || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Course & Degree</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{user?.course || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Department</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{user?.department || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Academic Year</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">
                  {user?.year ? `Year ${user.year}` : "Not specified"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Contact Phone</dt>
                <dd className="text-slate-900 font-semibold mt-0.5">{user?.phone || "Not specified"}</dd>
              </div>
            </dl>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                href="/dashboard/profile"
                className="w-full inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                ✏️ Edit Profile Details
              </Link>
            </div>
          </div>

          {/* Recent Notifications Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h2 className="text-sm font-bold text-slate-900">Recent Notifications</h2>
              </div>
              <Link
                href="/dashboard/notifications"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View all &rarr;
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {recentNotifications.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-400">No new notifications</p>
                </div>
              ) : (
                recentNotifications.map((notif) => (
                  <Link
                    key={notif._id}
                    href={notif.link || "/dashboard/notifications"}
                    className="block py-2.5 px-1 hover:bg-slate-50 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate">
                        {notif.title}
                      </span>
                      {!notif.readAt && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {notif.message}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Portal Modules */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active Card: Eligible Hostels */}
          <Link
            href="/dashboard/hostels"
            className="group block relative overflow-hidden rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-xl border border-indigo-100 group-hover:scale-105 transition-transform">
                  🏢
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Browse Eligible Hostels
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View campus hostels you qualify for, inspect facilities, rules, and real-time available beds.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                Active
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>Explore residential accommodations</span>
              <span>Open &rarr;</span>
            </div>
          </Link>

          {/* Active Card: My Preferences */}
          <Link
            href="/dashboard/preferences"
            className="group block relative overflow-hidden rounded-2xl border border-blue-200 bg-white p-6 shadow-sm hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-xl border border-blue-100 group-hover:scale-105 transition-transform">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    My Lifestyle Preferences
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define sleep schedules, study habits, room type choices, dietary tolerances, and deal-breakers.
                  </p>
                </div>
              </div>
              {status.preferencesCompleted ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                  ✓ Completed
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
                  Pending
                </span>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
              <span>
                {status.preferencesCompleted ? "Review or update questionnaire" : "Answer questionnaire"}
              </span>
              <span>{status.preferencesCompleted ? "Edit &rarr;" : "Start &rarr;"}</span>
            </div>
          </Link>

          {/* Card: Roommate Matches - LIVE */}
          <Link
            href="/dashboard/matches"
            className="group relative overflow-hidden rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg group-hover:scale-105 transition-transform">
                    🤝
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Roommate Matches
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Explore compatible roommate peers calculated from your lifestyle & study routines.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Active
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>
                {status.preferencesCompleted
                  ? "Browse compatible matches"
                  : "Complete preferences to unlock"}
              </span>
              <span>Explore &rarr;</span>
            </div>
          </Link>

          {/* Card: My Group - LIVE */}
          <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm hover:border-indigo-500 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg">
                  👥
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Roommate Group
                    </h3>
                    {groupInfo && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        groupInfo.status === "complete"
                          ? "bg-emerald-100 text-emerald-800"
                          : groupInfo.status === "locked"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}>
                        {groupInfo.status.toUpperCase()} ({groupInfo.seatsFilled}/{groupInfo.targetSize})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {groupInfo
                      ? groupInfo.isLeader
                        ? `You are the group leader (${groupInfo.seatsFilled}/${groupInfo.targetSize} beds filled).`
                        : `You are a member of this ${groupInfo.targetSize}-bed group.`
                      : "Form a custom group with matched peers or register for auto-allocation."}
                  </p>
                </div>
              </div>

              {pendingInvitesCount > 0 && (
                <Link
                  href="/dashboard/invitations"
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 text-xs font-bold animate-pulse hover:bg-amber-200"
                >
                  ✉️ {pendingInvitesCount} Invite{pendingInvitesCount > 1 ? "s" : ""}
                </Link>
              )}
            </div>

            {groupInfo ? (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-600">
                    {groupInfo.averageScore ? `Average: ${groupInfo.averageScore}%` : "Group Active"}
                  </span>
                  {groupInfo.roomPreferences?.preferredHostels?.length > 0 ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ Room preferences set
                    </span>
                  ) : (
                    <Link href="/dashboard/group" className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full hover:bg-amber-100">
                      ⚙️ Set room preferences
                    </Link>
                  )}
                </div>
                <Link href="/dashboard/group" className="text-indigo-600 hover:text-indigo-800 shrink-0">
                  Manage Group &rarr;
                </Link>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">No active group</span>
                <div className="flex items-center gap-3">
                  {pendingInvitesCount > 0 && (
                    <Link href="/dashboard/invitations" className="text-amber-700 hover:underline">
                      View Invitations ({pendingInvitesCount})
                    </Link>
                  )}
                  <Link href="/dashboard/group" className="text-indigo-600 hover:text-indigo-800">
                    Create or Join &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Card: My Room - LIVE */}
          <Link
            href="/dashboard/room"
            className="group relative overflow-hidden rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg group-hover:scale-105 transition-transform">
                    🛏️
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      My Room
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {allocation?.status === "allocated"
                        ? `Room #${allocation.room?.roomNumber} assigned in ${allocation.hostel?.name}`
                        : allocation?.status === "waitlisted"
                        ? "You are currently placed on the room waitlist."
                        : "Inspect room residency, assigned roommates, and hostel facilities."}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    allocation?.status === "allocated"
                      ? "emerald"
                      : allocation?.status === "waitlisted"
                      ? "amber"
                      : "blue"
                  }
                  size="sm"
                >
                  {allocation?.status === "allocated"
                    ? "✓ ALLOCATED"
                    : allocation?.status === "waitlisted"
                    ? "WAITLISTED"
                    : "PENDING"}
                </Badge>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>
                {allocation?.status === "allocated"
                  ? "View room & roommate details"
                  : "Check allocation status"}
              </span>
              <span>Open &rarr;</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
