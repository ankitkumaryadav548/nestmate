"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import { useToast } from "@/context/ToastContext";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  Badge,
  Button,
  Avatar,
  Select,
  EmptyState,
  ErrorState,
  Skeleton,
  PageTransition,
  Reveal,
  IconBed,
  IconBuilding,
  IconUsers,
  IconShield,
  IconCheck,
} from "@/components/ui";

export default function RoommatesPage() {
  useDocumentTitle("My Roommates");
  const { showToast } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  // Leader assignment state
  const [localAssignments, setLocalAssignments] = useState({});
  const [initialAssignments, setInitialAssignments] = useState({});
  const [saving, setSaving] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(null);

  const fetchRoommates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      const res = await axios.get("/api/roommates/me");
      if (res.data?.success) {
        const d = res.data.data;
        setData(d);

        // Build initial assignments map
        const initial = {};
        (d.beds || []).forEach((b) => {
          if (b.member) {
            initial[b.member.id] = b.bedNumber;
          }
        });
        (d.unassignedMembers || []).forEach((m) => {
          initial[m.id] = null;
        });

        setInitialAssignments(initial);
        setLocalAssignments(initial);
      }
    } catch (err) {
      console.error("Failed to load roommates:", err);
      const code = err.response?.data?.data?.code || err.response?.data?.code;
      setErrorCode(code);
      setError(err.response?.data?.message || "Failed to load roommate details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoommates();
  }, [fetchRoommates]);

  // Combine all active members in room
  const allMembers = useMemo(() => {
    if (!data) return [];
    const list = [];
    (data.beds || []).forEach((b) => {
      if (b.member && !list.some((m) => m.id === b.member.id)) {
        list.push(b.member);
      }
    });
    (data.unassignedMembers || []).forEach((m) => {
      if (!list.some((existing) => existing.id === m.id)) {
        list.push(m);
      }
    });
    return list;
  }, [data]);

  // Detect dirty assignment state
  const hasChanges = useMemo(() => {
    if (!data?.isLeader) return false;
    for (const [uid, bed] of Object.entries(localAssignments)) {
      if (initialAssignments[uid] !== bed) return true;
    }
    return false;
  }, [localAssignments, initialAssignments, data?.isLeader]);

  // Save leader bed assignments
  const handleSaveBeds = async () => {
    if (!hasChanges || saving) return;
    try {
      setSaving(true);
      const payload = Object.entries(localAssignments).map(([userId, bedNumber]) => ({
        userId,
        bedNumber,
      }));

      const res = await axios.put("/api/roommates/me/beds", { assignments: payload });
      if (res.data?.success) {
        showToast(res.data.message || "Bed assignments saved successfully.", "success");
        await fetchRoommates();
      }
    } catch (err) {
      console.error("Save beds error:", err);
      showToast(err.response?.data?.message || "Failed to save bed assignments.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Auto-assign remaining beds
  const handleAutoAssign = async () => {
    if (autoAssigning || saving) return;
    try {
      setAutoAssigning(true);
      const res = await axios.post("/api/roommates/me/beds/auto");
      if (res.data?.success) {
        showToast(res.data.message || "Beds auto-assigned successfully.", "success");
        await fetchRoommates();
      }
    } catch (err) {
      console.error("Auto-assign beds error:", err);
      showToast(err.response?.data?.message || "Failed to auto-assign beds.", "error");
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleCopyPhone = (phone) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    showToast("Phone number copied to clipboard", "success");
    setTimeout(() => setCopiedPhone(null), 3000);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    if (errorCode === "NO_ACTIVE_ALLOCATION" || error.includes("allocation yet")) {
      return (
        <PageTransition>
          <div className="max-w-4xl mx-auto py-12 px-4 text-center">
            <EmptyState
              icon={<IconBed className="w-12 h-12 text-indigo-500 mx-auto" />}
              title="No Room Allocation Yet"
              description="You have not been placed in a hostel room yet. Once you claim a room during an open selection window or when an official allocation run is published, your roommates and bed assignments will appear here."
              action={
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  <Link href="/dashboard/rooms">
                    <Button variant="primary">Browse Selection Rooms &rarr;</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="secondary">&larr; Back to Dashboard</Button>
                  </Link>
                </div>
              }
            />
          </div>
        </PageTransition>
      );
    }

    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <ErrorState
            title="Failed to Load Roommates"
            message={error}
            onRetry={fetchRoommates}
          />
        </div>
      </PageTransition>
    );
  }

  const { hostel, room, isLeader, beds, unassignedMembers, openSeats } = data;

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <Reveal direction="down">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <IconUsers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
                  My Roommates
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Official bed assignments and co-occupants in your allocated unit.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/dashboard/room">
                <Button variant="secondary" size="sm">
                  View My Room &rarr;
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  &larr; Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Hero Unit Card */}
        <Reveal direction="up" delay={50}>
          <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
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

                <div className="flex items-center gap-3 text-xs text-indigo-200/90 font-medium">
                  <span>{room.roomType}</span>
                  <span>•</span>
                  <span>{room.capacity} Bed Capacity</span>
                  {openSeats > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-300 font-bold">
                        {openSeats} Open Seat{openSeats > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Leader Status / Notice */}
              <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-md max-w-xs text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-200">
                  <IconShield className="w-4 h-4 text-indigo-300" />
                  {isLeader ? "You are Group Leader" : "Group Member View"}
                </div>
                <p className="text-white/80 leading-relaxed text-[11px]">
                  {isLeader
                    ? "As group leader, you can assign physical beds to each member below."
                    : "Your group leader assigns the beds. You can view your placement below."}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Member Read-Only Note */}
        {!isLeader && (
          <Reveal direction="up" delay={80}>
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 p-4 text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
              <IconShield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Your group leader assigns the beds. Bed numbers are reserved once assigned.</span>
            </div>
          </Reveal>
        )}

        {/* Bed Layout Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-heading">
              Physical Bed Layout ({beds.length} Total Beds)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {beds.map((b) => {
              const mem = b.member;
              return (
                <Card
                  key={b.bedNumber}
                  variant="default"
                  className={`relative p-5 transition-all ${
                    mem
                      ? mem.isMe
                        ? "ring-2 ring-indigo-500 dark:ring-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10"
                        : "border-slate-200 dark:border-slate-800"
                      : "border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30"
                  }`}
                >
                  {/* Bed Header Tag */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black tracking-wide bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-mono">
                      <IconBed className="w-3.5 h-3.5" />
                      Bed #{b.bedNumber}
                    </span>

                    {mem?.isLeader && (
                      <Badge variant="brand" size="sm">
                        👑 Leader
                      </Badge>
                    )}
                    {mem?.isMe && !mem?.isLeader && (
                      <Badge variant="success" size="sm">
                        You
                      </Badge>
                    )}
                    {!mem && (
                      <Badge variant="neutral" size="sm">
                        Unoccupied
                      </Badge>
                    )}
                  </div>

                  {mem ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar name={mem.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {mem.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {mem.course} {mem.year ? `• Year ${mem.year}` : ""}
                          </p>
                          {mem.department && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              {mem.department}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Phone Contact */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        {mem.phoneStatus === "shared" && mem.phone ? (
                          <div className="flex items-center justify-between gap-2">
                            <a
                              href={`tel:${mem.phone}`}
                              className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              📞 {mem.phone}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(mem.phone)}
                              className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              {copiedPhone === mem.phone ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        ) : mem.phoneStatus === "hidden_by_student" ? (
                          <span className="text-[11px] text-slate-400 italic">
                            🔒 Phone hidden by student
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            No phone provided
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-xs text-slate-400 font-medium">Empty Bed</p>
                      {isLeader && openSeats > 0 && (
                        <Link href="/dashboard/group">
                          <Button variant="outline" size="xs">
                            + Invite Roommate
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Unassigned Members Section */}
        {unassignedMembers && unassignedMembers.length > 0 && (
          <Reveal direction="up" delay={100}>
            <Card variant="default" className="p-5 border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/10">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-3">
                ⚠️ Bed Not Assigned Yet ({unassignedMembers.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {unassignedMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                    <Avatar name={m.name} size="sm" />
                    <div className="min-w-0 flex-1 text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                        {m.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                        {m.course}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        )}

        {/* Leader Bed Assignment Controls Card */}
        {isLeader && (
          <Reveal direction="up" delay={120}>
            <Card variant="default" className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                    Assign Bed Numbers
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select a bed number (1 to {room.capacity}) for each room member.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={autoAssigning}
                    disabled={saving || autoAssigning}
                    onClick={handleAutoAssign}
                  >
                    ⚡ Auto-Assign Remaining
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    loading={saving}
                    disabled={!hasChanges || saving || autoAssigning}
                    onClick={handleSaveBeds}
                  >
                    Save Beds
                  </Button>
                </div>
              </div>

              {/* Members Assignment Table / List */}
              <div className="space-y-4">
                {allMembers.map((m) => {
                  const currentBed = localAssignments[m.id];
                  return (
                    <div
                      key={m.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {m.name}
                            </span>
                            {m.isLeader && (
                              <Badge variant="brand" size="xs">
                                Leader
                              </Badge>
                            )}
                            {m.isMe && (
                              <Badge variant="success" size="xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {m.course} {m.year ? `• Year ${m.year}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="w-full sm:w-64">
                        <Select
                          value={currentBed !== null && currentBed !== undefined ? String(currentBed) : ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                            setLocalAssignments((prev) => ({
                              ...prev,
                              [m.id]: val,
                            }));
                          }}
                          options={[
                            { value: "", label: "No Bed Assigned" },
                            ...Array.from({ length: room.capacity }, (_, idx) => {
                              const bNum = idx + 1;
                              const currentHolderId = Object.keys(localAssignments).find(
                                (uid) => localAssignments[uid] === bNum && uid !== m.id
                              );
                              const holder = allMembers.find((mem) => mem.id === currentHolderId);
                              const label = holder
                                ? `Bed #${bNum} (Taken: ${holder.name})`
                                : `Bed #${bNum} (Available)`;
                              return {
                                value: String(bNum),
                                label,
                              };
                            }),
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </Reveal>
        )}
      </div>
    </PageTransition>
  );
}

