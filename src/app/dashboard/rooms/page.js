"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ConfirmDialog,
  Alert,
  Select,
  Pagination,
  EmptyState,
  PageTransition,
  Reveal,
  IconBed,
  IconBuilding,
  IconSparkles,
  IconShield,
  IconCheck,
} from "@/components/ui";
import { LIST_POLL_SECONDS } from "@/config/selection";

export default function StudentRoomsPage() {
  useDocumentTitle("Choose Room");
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stateData, setStateData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);

  // Filters
  const [selectedHostel, setSelectedHostel] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");

  // Countdown timer state
  const [countdown, setCountdown] = useState(null);

  // Selection & release action state
  const [selectingRoom, setSelectingRoom] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    action: null,
    variant: "primary",
  });

  const pollTimerRef = useRef(null);

  // Fetch selection state & student eligibility
  const fetchState = useCallback(async () => {
    try {
      const res = await axios.get("/api/selection/state");
      if (res.data?.success) {
        setStateData(res.data.data);
        setCountdown(res.data.data?.countdown || null);
      }
    } catch (err) {
      console.error("Failed to load selection state:", err);
      setError(err.response?.data?.message || "Failed to load selection state");
    }
  }, []);

  // Fetch selectable rooms
  const fetchRooms = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const params = {
        page,
        limit: 24,
      };
      if (selectedHostel) params.hostelId = selectedHostel;
      if (selectedRoomType) params.roomType = selectedRoomType;
      if (selectedFloor !== "") params.floor = selectedFloor;

      const res = await axios.get("/api/selection/rooms", { params });
      if (res.data?.success) {
        const d = res.data.data;
        setRooms(d.rooms || []);
        setHostels(d.hostels || []);
        setTotalRooms(d.total || 0);
        setTotalPages(d.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
      if (!isPolling) {
        setError(err.response?.data?.message || "Failed to load rooms");
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [page, selectedHostel, selectedRoomType, selectedFloor]);

  // Initial load
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await fetchState();
      await fetchRooms(false);
      setLoading(false);
    }
    loadAll();
  }, [fetchState, fetchRooms]);

  // Live countdown ticker
  useEffect(() => {
    if (!stateData?.window) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const starts = new Date(stateData.window.startsAt).getTime();
      const ends = new Date(stateData.window.endsAt).getTime();

      if (stateData.window.status === "scheduled") {
        const diff = starts - now;
        if (diff <= 0) {
          fetchState();
          fetchRooms(false);
        } else {
          setCountdown({
            diffMs: diff,
            minutes: Math.floor(diff / 60000),
            seconds: Math.floor((diff % 60000) / 1000),
          });
        }
      } else if (stateData.window.status === "open") {
        const diff = ends - now;
        if (diff <= 0) {
          fetchState();
          fetchRooms(false);
        } else {
          setCountdown({
            diffMs: diff,
            minutes: Math.floor(diff / 60000),
            seconds: Math.floor((diff % 60000) / 1000),
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stateData, fetchState, fetchRooms]);

  // Background polling while window is open
  useEffect(() => {
    if (stateData?.window?.status !== "open") return;

    pollTimerRef.current = setInterval(() => {
      fetchRooms(true);
      fetchState();
    }, LIST_POLL_SECONDS * 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [stateData?.window?.status, fetchRooms, fetchState]);

  // Handle room selection
  const handleSelectRoom = async (room) => {
    try {
      setActionLoading(true);
      setActionAlert(null);
      const res = await axios.post("/api/selection/select", { roomId: room.id });
      if (res.data?.success) {
        showToast(`Success! Room #${room.roomNumber} has been reserved for your group.`, "success");
        if (room.capacity === 1) {
          router.push("/dashboard/room");
        } else {
          router.push("/dashboard/roommates");
        }
      }
    } catch (err) {
      console.error("Select room failed:", err);
      showToast(err.response?.data?.message || "Failed to select room. It may have just been claimed by another student.", "error");
      await fetchRooms(true);
    } finally {
      setActionLoading(false);
      setSelectingRoom(null);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Handle room release
  const handleReleaseRoom = async () => {
    try {
      setActionLoading(true);
      setActionAlert(null);
      const res = await axios.post("/api/selection/release");
      if (res.data?.success) {
        showToast("Your previously selected room has been released.", "info");
        await fetchState();
        await fetchRooms(false);
      }
    } catch (err) {
      console.error("Release room failed:", err);
      showToast(err.response?.data?.message || "Failed to release room.", "error");
    } finally {
      setActionLoading(false);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const windowStatus = stateData?.window?.status || "none";
  const eligibility = stateData
    ? {
        canSelect: stateData.eligibility?.canSelect ?? stateData.canSelect ?? false,
        code: stateData.eligibility?.code ?? stateData.code ?? null,
        reason: stateData.eligibility?.reason ?? stateData.message ?? "Not eligible to select a room.",
      }
    : { canSelect: false, reason: "Loading..." };
  const releaseEligibility = stateData?.releaseEligibility || { canRelease: false };
  const currentClaim = stateData?.currentClaim;

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <Reveal direction="down">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <IconBed className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
                  Room Selection Window
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                First-Come, First-Served room claiming with immediate allocation lock.
              </p>
            </div>

            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                &larr; Back to Dashboard
              </Button>
            </Link>
          </div>
        </Reveal>

        {/* Window Status Banner */}
        <Reveal direction="up" delay={50}>
          <div
            className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl transition-all ${
              windowStatus === "open"
                ? "bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 shadow-emerald-900/20"
                : windowStatus === "scheduled"
                ? "bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 shadow-indigo-900/20"
                : windowStatus === "closed"
                ? "bg-gradient-to-r from-amber-700 via-orange-800 to-slate-900 shadow-amber-900/20"
                : windowStatus === "finalized"
                ? "bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-950 shadow-purple-900/20"
                : "bg-gradient-to-r from-slate-700 to-slate-900"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      windowStatus === "open" ? "bg-emerald-300 animate-ping" : "bg-white"
                    }`}
                  />
                  Window Status: {windowStatus}
                </div>

                <h2 className="text-xl sm:text-2xl font-black font-heading">
                  {windowStatus === "open" && "Room Selection is LIVE!"}
                  {windowStatus === "scheduled" && "Upcoming Selection Window"}
                  {windowStatus === "closed" && "Selection Window Closed"}
                  {windowStatus === "finalized" && "Room Selection Finalized"}
                  {windowStatus === "none" && "No Active Selection Window"}
                </h2>

                <p className="text-xs sm:text-sm text-white/90 max-w-2xl leading-relaxed">
                  {windowStatus === "open" &&
                    "The floor is open! Leaders and single-room students can choose any available room. Picks are confirmed immediately and reserved for your group."}
                  {windowStatus === "scheduled" &&
                    "Prepare your group and room preferences. The room browser will unlock automatically as soon as the countdown reaches zero."}
                  {windowStatus === "closed" &&
                    "Room selection has concluded. The administration will finalize locked groups and auto-fill remaining open seats."}
                  {windowStatus === "finalized" &&
                    "All selection window assignments and auto-fills have been finalized. Check your confirmed assignment in My Room."}
                  {windowStatus === "none" &&
                    "An administrator has not scheduled an open selection window yet. Check back soon!"}
                </p>
              </div>

              {/* Countdown Display */}
              {countdown && (windowStatus === "open" || windowStatus === "scheduled") && (
                <div className="bg-white/15 border border-white/25 rounded-2xl p-4 text-center shrink-0 min-w-[160px] backdrop-blur-md shadow-md">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 block">
                    {windowStatus === "open" ? "Closes In" : "Opens In"}
                  </span>
                  <div className="text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                    {String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
                  </div>
                  <span className="text-[11px] text-white/70 block mt-0.5">minutes : seconds</span>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* Claimed Room Summary Card */}
        {currentClaim && (
          <Reveal direction="up" delay={100}>
            <Alert
              variant="success"
              title={`Your Unit Selected Room #${currentClaim.room?.roomNumber} (${currentClaim.hostel?.name})`}
              action={
                releaseEligibility.canRelease ? (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={actionLoading}
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        title: "Release Selected Room?",
                        message: `Are you sure you want to release Room #${currentClaim.room?.roomNumber}? It will immediately become available for other students to claim.`,
                        variant: "danger",
                        action: handleReleaseRoom,
                      })
                    }
                  >
                    Release Room
                  </Button>
                ) : undefined
              }
            >
              Floor {currentClaim.room?.floor} • {currentClaim.room?.roomType} • {currentClaim.room?.capacity} Beds
              {currentClaim.openSeats > 0 && (
                <span className="font-semibold text-teal-800 dark:text-teal-300 ml-2">
                  ({currentClaim.openSeats} seat{currentClaim.openSeats > 1 ? "s" : ""} remaining for your group)
                </span>
              )}
            </Alert>
          </Reveal>
        )}

        {/* Eligibility Warning Alert */}
        {stateData && !eligibility.canSelect && (
          <Reveal direction="up" delay={100}>
            <Alert
              variant="warning"
              title="Selection Window Notice"
              action={
                eligibility.code === "PREFERENCES_INCOMPLETE" ? (
                  <Link href="/dashboard/preferences">
                    <Button variant="primary" size="sm">
                      Complete Preferences &rarr;
                    </Button>
                  </Link>
                ) : eligibility.code === "NOT_GROUP_LEADER" ? (
                  <Link href="/dashboard/group">
                    <Button variant="secondary" size="sm">
                      View Group &rarr;
                    </Button>
                  </Link>
                ) : undefined
              }
            >
              {eligibility.reason}
            </Alert>
          </Reveal>
        )}

        {/* Filters Card */}
        <Reveal direction="up" delay={150}>
          <Card variant="default" className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Hostel"
                value={selectedHostel}
                onChange={(e) => {
                  setSelectedHostel(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "All Eligible Hostels" },
                  ...hostels.map((h) => ({ value: h.id || h._id, label: `${h.name} (${h.code})` })),
                ]}
              />

              <Select
                label="Room Type"
                value={selectedRoomType}
                onChange={(e) => {
                  setSelectedRoomType(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "All Cooling Types" },
                  { value: "AC", label: "Air Conditioned (AC)" },
                  { value: "Non-AC", label: "Non-AC (Ventilated)" },
                ]}
              />

              <Select
                label="Floor Level"
                value={selectedFloor}
                onChange={(e) => {
                  setSelectedFloor(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "All Floors" },
                  { value: "0", label: "Ground Floor (Floor 0)" },
                  { value: "1", label: "Floor 1" },
                  { value: "2", label: "Floor 2" },
                  { value: "3", label: "Floor 3" },
                  { value: "4", label: "Floor 4" },
                ]}
              />
            </div>
          </Card>
        </Reveal>

        {/* Room Cards Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-5 h-44 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <Alert
              variant="danger"
              title="Error Loading Selection State"
              action={
                <Button variant="outline" size="sm" onClick={() => { fetchState(); fetchRooms(); }}>
                  Try again
                </Button>
              }
            >
              {error}
            </Alert>
          ) : rooms.length === 0 ? (
            <EmptyState
              icon="ðŸšª"
              title="No Available Rooms Matching Filters"
              description="No free rooms match your selected hostel, cooling, or floor filters. Try clearing your filters."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedHostel("");
                    setSelectedRoomType("");
                    setSelectedFloor("");
                  }}
                >
                  Reset Filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rooms.map((room, idx) => {
                  const isClaimedByMe = currentClaim?.room?.id === room.id;

                  return (
                    <Reveal key={room.id} direction="up" delay={Math.min(idx * 40, 400)}>
                      <Card
                        variant="interactive"
                        className={`p-5 flex flex-col justify-between ${
                          isClaimedByMe
                            ? "border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20"
                            : ""
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-heading">
                                #{room.roomNumber}
                              </span>
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                                {room.hostelName} ({room.hostelCode}) • Floor {room.floor}
                              </p>
                            </div>

                            <Badge
                              variant={room.roomType === "AC" ? "info" : "neutral"}
                              size="sm"
                            >
                              {room.roomType}
                            </Badge>
                          </div>

                          {/* Capacity Beds */}
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Capacity:</span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: room.capacity || 2 }).map((_, i) => (
                                <IconBed key={i} className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              ))}
                            </div>
                            <span>({room.capacity}-seater)</span>
                          </div>

                          {/* Preference Match Badges */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {room.isFirstChoiceHostel && (
                              <Badge variant="success" size="sm">
                                ðŸŒŸ 1st Choice Hostel
                              </Badge>
                            )}
                            {room.acMatchesPreference && (
                              <Badge variant="brand" size="sm">
                                â„ï¸ AC Matches
                              </Badge>
                            )}
                            {room.floorMatchesPreference && (
                              <Badge variant="neutral" size="sm">
                                ðŸ“ Preferred Floor
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Card Action */}
                        <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {room.status === "available" ? "Ready to claim" : room.status}
                          </span>

                          {isClaimedByMe ? (
                            <Badge variant="success" size="sm">
                               ✓ Your Selected Room
                            </Badge>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!eligibility.canSelect || actionLoading}
                              onClick={() => {
                                setSelectingRoom(room);
                                setConfirmDialog({
                                  isOpen: true,
                                  title: `Claim Room #${room.roomNumber}?`,
                                  message: `You are about to select Room #${room.roomNumber} in ${room.hostelName} (${room.roomType}, ${room.capacity}-seater). This claim is immediate and final.`,
                                  variant: "primary",
                                  action: () => handleSelectRoom(room),
                                });
                              }}
                            >
                              Select This Room &rarr;
                            </Button>
                          )}
                        </div>
                      </Card>
                    </Reveal>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="pt-4 flex justify-center">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => {
                      setPage(p);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Global Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.action}
          onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        />

      </div>
    </PageTransition>
  );
}
