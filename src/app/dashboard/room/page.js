"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import { useToast } from "@/context/ToastContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  Badge,
  Button,
  ScoreRing,
  Avatar,
  EmptyState,
  PageTransition,
  Reveal,
  IconBed,
  IconBuilding,
  IconShield,
  IconCheck,
} from "@/components/ui";
import { getScoreTone, getScoreClasses } from "@/components/ui/ScoreTone";

export default function MyRoomPage() {
  const { showToast } = useToast();
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
    showToast("Phone number copied to clipboard!", "success");
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Checking room allocation status...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <EmptyState
          icon="⚠️"
          title="Unable to Load Room Details"
          description={error}
          action={
            <Link href="/dashboard">
              <Button variant="secondary">&larr; Back to Dashboard</Button>
            </Link>
          }
        />
      </div>
    );
  }

  // 1. ALLOCATED STATE
  if (allocation?.status === "allocated") {
    const { hostel, room, roommates = [], groupAverage, allocatedAt } = allocation;

    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          
          {/* Header */}
          <Reveal direction="down">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="success" size="md" dot>
                    ✓ ALLOCATED &amp; ACTIVE
                  </Badge>
                  {allocation.source && (
                    <Badge variant="brand" size="sm">
                      {allocation.source === "selection" ? "FCFS Room Selection" : "Allocation Run"}
                    </Badge>
                  )}
                  {allocatedAt && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Since {new Date(allocatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
                  My Hostel Room
                </h1>
              </div>
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
                  &larr; Back to Dashboard
                </Button>
              </Link>
            </div>
          </Reveal>

          {/* Hero Room Card with subtle gradient header band */}
          <Reveal direction="up" delay={50}>
            <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-semibold text-indigo-200 border border-white/10">
                    <IconBuilding className="w-4 h-4 text-indigo-300" /> {hostel.name} ({hostel.code})
                  </div>

                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-heading">
                      Room #{room.roomNumber}
                    </span>
                    <span className="text-lg font-semibold text-indigo-300">
                      Floor {room.floor}
                    </span>
                  </div>

                  {hostel.location && (
                    <p className="text-xs text-indigo-200/80">
                      📍 {hostel.location}
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
                    {allocation.openSeats > 0 && (
                      <span className="rounded-lg bg-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-200 border border-amber-400/30">
                        {allocation.openSeats} Open Seat{allocation.openSeats > 1 ? "s" : ""} Reserved
                      </span>
                    )}
                    <span className="rounded-lg bg-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-200 border border-indigo-400/30">
                      {groupAverage}% Room Compatibility
                    </span>
                  </div>
                </div>

                {/* Hostel Facilities & Rules Box */}
                <div className="md:w-72 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm space-y-3 text-xs">
                  {hostel.facilities?.length > 0 && (
                    <div>
                      <span className="font-bold uppercase tracking-wider text-indigo-300 text-[10px] block mb-1.5 font-heading">
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
                      <span className="font-bold uppercase tracking-wider text-indigo-300 text-[10px] block mb-1 font-heading">
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
          </Reveal>

          {/* Roommates Section */}
          <div className="space-y-4">
            <Reveal direction="up" delay={100}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
                    Assigned Roommates
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Co-occupants sharing Room {room.roomNumber} with you.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {roommates.length} {roommates.length === 1 ? "roommate" : "roommates"}
                </span>
              </div>
            </Reveal>

            {roommates.length === 0 ? (
              <Reveal direction="up" delay={150}>
                <Card className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  You are currently the sole occupant assigned to this room. Additional roommates may be placed during subsequent rounds.
                </Card>
              </Reveal>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {roommates.map((rm, idx) => (
                  <Reveal key={idx} direction="up" delay={Math.min(idx * 50, 400)}>
                    <Card
                      variant="interactive"
                      className="p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <Avatar name={rm.name} size="md" />
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                                {rm.name}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {[rm.course, rm.department].filter(Boolean).join(" • ")}
                              </p>
                              {rm.year && (
                                <Badge variant="brand" size="sm" className="mt-1">
                                  Year {rm.year}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <ScoreRing score={rm.compatibilityScore} size={44} strokeWidth={4} />
                        </div>

                        {/* Shared Languages */}
                        {rm.sharedLanguages?.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                              Shared Languages
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {rm.sharedLanguages.map((lang, lIdx) => (
                                <span
                                  key={lIdx}
                                  className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                                >
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Phone Number Safeguard Area */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        {rm.phoneStatus === "shared" && rm.phone ? (
                          <div className="flex items-center justify-between gap-2">
                            <a
                              href={`tel:${rm.phone}`}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              <span>📞</span> {rm.phone}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(rm.phone)}
                              className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                            >
                              {copiedPhone === rm.phone ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        ) : rm.phoneStatus === "hidden_by_student" ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                            <span>🔒</span>
                            <span>Phone hidden by student</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                            <span>📵</span>
                            <span>Phone not provided</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Reveal>
                ))}
              </div>
            )}

            {/* Privacy Safeguard Note */}
            <Reveal direction="up" delay={200}>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 text-xs text-slate-500 dark:text-slate-400">
                <IconShield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  <strong>Privacy Note:</strong> Only your assigned room co-occupants can view your contact number. You can update your contact sharing preference anytime in your{" "}
                  <Link href="/dashboard/profile" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">
                    profile settings
                  </Link>.
                </span>
              </div>
            </Reveal>
          </div>
        </div>
      </PageTransition>
    );
  }

  // 2. WAITLISTED STATE
  if (allocation?.status === "waitlisted") {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon="⏳"
            title="You Are on the Room Waitlist"
            description={`Reason: ${allocation.reason}. All rooms matching your preferences or group size were claimed by higher-priority applicants in the latest allocation run. The hostel administration will review availability for subsequent rounds.`}
            action={
              <Link href="/dashboard">
                <Button variant="secondary">&larr; Back to Dashboard</Button>
              </Link>
            }
          />
        </div>
      </PageTransition>
    );
  }

  // 3. NOT ALLOCATED STATE
  if (allocation?.status === "not_allocated") {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon="⚠️"
            title="Placement Not Completed"
            description={`${allocation.reason}: ${allocation.description}. ${allocation.nextStep ? `Next Step: ${allocation.nextStep}` : ""}`}
            action={
              <div className="flex items-center gap-3">
                <Link href="/dashboard/preferences">
                  <Button variant="primary">Update Preferences &rarr;</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary">Dashboard</Button>
                </Link>
              </div>
            }
          />
        </div>
      </PageTransition>
    );
  }

  // 4. PENDING PUBLICATION STATE (Default)
  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <EmptyState
          icon="📋"
          title="Hostel Allocations Not Published Yet"
          description="Room placement results have not been officially published by hostel administration. Ensure your roommate group is complete and your room preferences are submitted."
          action={
            <div className="flex items-center gap-3">
              <Link href="/dashboard/group">
                <Button variant="primary">Check My Group &rarr;</Button>
              </Link>
              <Link href="/dashboard/preferences">
                <Button variant="secondary">Review Preferences</Button>
              </Link>
            </div>
          }
        />
      </div>
    </PageTransition>
  );
}
