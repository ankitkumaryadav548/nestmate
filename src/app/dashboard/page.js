"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
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
              Track your residential status, explore eligible hostel blocks, and check free room inventory.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Student Profile Card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              Profile Overview
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Verified
              </span>
            </h2>

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
              {user?.phone && (
                <div>
                  <dt className="text-slate-500 font-medium">Phone</dt>
                  <dd className="text-slate-900 font-semibold mt-0.5">{user.phone}</dd>
                </div>
              )}
            </dl>
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

          {/* Card: My Preferences (Coming soon) */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm opacity-80">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 text-lg">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">My Preferences</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define sleep schedules, study habits, room type choices, and lifestyle criteria.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
                Coming soon
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Preference Questionnaire</span>
              <span>Module locked</span>
            </div>
          </div>

          {/* Card: Roommate Matches (Coming soon) */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm opacity-80">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 text-lg">
                  🤝
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Roommate Matches</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Explore high-compatibility roommate suggestions calculated by our matching algorithms.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
                Coming soon
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Matching Engine & Requests</span>
              <span>Module locked</span>
            </div>
          </div>

          {/* Card: My Room (Coming soon) */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm opacity-80">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 text-lg">
                  🛏️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">My Room</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View assigned hostel block, floor, room number, bed label, and check-in timeline.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
                Coming soon
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Automated Allocation</span>
              <span>Module locked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
