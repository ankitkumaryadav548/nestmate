"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export default function MyRoomPage() {
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(null);

  useEffect(() => {
    async function fetchMyRoom() {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get("/api/allocation/me");
        if (res.data?.success) {
          setAllocation(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load allocation:", err);
        setError(err.response?.data?.message || "Failed to load room details");
      } finally {
        setLoading(false);
      }
    }
    fetchMyRoom();
  }, []);

  const handleCopyPhone = (phone) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">Checking room allocation status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <h2 className="text-base font-bold">Unable to Load Room Details</h2>
        <p className="text-xs mt-1">{error}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  // 1. ALLOCATED STATE
  if (allocation?.status === "allocated") {
    const { hostel, room, roommates = [], groupAverage, allocatedAt } = allocation;

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="emerald" size="md">
                ✓ ALLOCATED &amp; ACTIVE
              </Badge>
              {allocatedAt && (
                <span className="text-xs text-slate-400 font-mono">
                  Since {new Date(allocatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              My Hostel Room
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 self-start sm:self-auto"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Hero Room Card */}
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-semibold text-indigo-200 border border-white/10">
                <span>🏢</span> {hostel.name} ({hostel.code})
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  Room #{room.roomNumber}
                </span>
                <span className="text-lg font-semibold text-indigo-300">
                  Floor {room.floor}
                </span>
              </div>

              {hostel.location && (
                <p className="text-xs text-indigo-200/80 flex items-center gap-1.5">
                  <span>📍</span> {hostel.location}
                </p>
              )}

              {/* Room Specifications Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                  {room.roomType}
                </span>
                <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                  {room.capacity} Bed Capacity
                </span>
                <span className="rounded-lg bg-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-200 border border-indigo-400/30">
                  {groupAverage}% Room Compatibility
                </span>
              </div>
            </div>

            {/* Hostel Facilities & Rules */}
            <div className="md:w-72 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm space-y-3 text-xs">
              {hostel.facilities?.length > 0 && (
                <div>
                  <span className="font-bold uppercase tracking-wider text-indigo-300 text-[10px] block mb-1.5">
                    Facilities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {hostel.facilities.map((f, i) => (
                      <span key={i} className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hostel.rules?.length > 0 && (
                <div>
                  <span className="font-bold uppercase tracking-wider text-indigo-300 text-[10px] block mb-1">
                    House Rules
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-indigo-100/90 space-y-0.5">
                    {hostel.rules.slice(0, 3).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Roommates Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Assigned Roommates</h2>
              <p className="text-xs text-slate-500">
                Co-occupants sharing Room {room.roomNumber} with you.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {roommates.length} {roommates.length === 1 ? "roommate" : "roommates"}
            </span>
          </div>

          {roommates.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-xs">
              You are currently the sole occupant assigned to this room. Additional roommates may be placed during subsequent rounds.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {roommates.map((rm, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Name & Year */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{rm.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {rm.course} {rm.department ? `• ${rm.department}` : ""}
                        </p>
                        {rm.year && (
                          <span className="inline-block text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md mt-1">
                            Year {rm.year}
                          </span>
                        )}
                      </div>

                      <Badge variant="blue" size="sm">
                        {rm.compatibilityScore}% Match
                      </Badge>
                    </div>

                    {/* Shared Languages */}
                    {rm.sharedLanguages?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Shared Languages
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {rm.sharedLanguages.map((lang, lIdx) => (
                            <span
                              key={lIdx}
                              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phone Number Safeguard Section */}
                  <div className="pt-3 border-t border-slate-100">
                    {rm.phoneStatus === "shared" && rm.phone ? (
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={`tel:${rm.phone}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          <span>📞</span> {rm.phone}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(rm.phone)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 px-2 py-1 rounded bg-slate-50 border border-slate-200"
                        >
                          {copiedPhone === rm.phone ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    ) : rm.phoneStatus === "hidden_by_student" ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>🔒</span>
                        <span>Phone hidden by student</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>📵</span>
                        <span>Phone not provided</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Privacy Note */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-500">
            <span>🛡️</span>
            <span>
              <strong>Privacy Note:</strong> Only your assigned room co-occupants can see your phone number. You can change your phone sharing preference anytime in your{" "}
              <Link href="/dashboard/profile" className="text-indigo-600 font-semibold underline">
                profile settings
              </Link>.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. WAITLISTED STATE
  if (allocation?.status === "waitlisted") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-8 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-md shadow-amber-500/20">
            ⏳
          </div>
          <div>
            <Badge variant="amber" size="lg">
              WAITLISTED
            </Badge>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              You Are on the Room Waitlist
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Reason: <strong>{allocation.reason}</strong>
            </p>
          </div>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            All rooms matching your preferences or group size were claimed by higher-priority applicants in the latest allocation run.
            The hostel administration will review availability for subsequent rounds.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. NOT ALLOCATED STATE
  if (allocation?.status === "not_allocated") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-8 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-md shadow-rose-500/20">
            ⚠️
          </div>
          <div>
            <Badge variant="rose" size="lg">
              NOT ALLOCATED
            </Badge>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              Placement Not Completed
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              {allocation.reason}: {allocation.description}
            </p>
          </div>
          {allocation.nextStep && (
            <div className="p-3 bg-white rounded-xl border border-rose-200 max-w-md mx-auto text-xs text-rose-900 font-semibold">
              Next Step: {allocation.nextStep}
            </div>
          )}
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/dashboard/preferences"
              className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Update Preferences &rarr;
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. PENDING PUBLICATION STATE (Default)
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-4 shadow-sm">
        <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-2xl mx-auto">
          📋
        </div>
        <div>
          <Badge variant="blue" size="lg">
            ALLOCATION PENDING
          </Badge>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Hostel Allocations Not Published Yet
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Room placement results have not been officially published by hostel administration.
            Ensure your roommate group is complete and your room preferences are submitted.
          </p>
        </div>
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard/group"
            className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Check My Group &rarr;
          </Link>
          <Link
            href="/dashboard/preferences"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Review Preferences
          </Link>
        </div>
      </div>
    </div>
  );
}
