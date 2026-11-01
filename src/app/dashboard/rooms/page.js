"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Alert from "@/components/ui/Alert";
import { LIST_POLL_SECONDS } from "@/config/selection";

export default function StudentRoomsPage() {
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

  // Background polling every LIST_POLL_SECONDS while window is open
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
        setActionAlert({
          type: "success",
          message: `Success! Room #${room.roomNumber} has been reserved for your group.`,
        });
        await fetchState();
        await fetchRooms(false);
      }
    } catch (err) {
      console.error("Select room failed:", err);
      setActionAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to select room. It may have just been claimed by another student.",
      });
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
        setActionAlert({
          type: "success",
          message: "Your previously selected room has been released.",
        });
        await fetchState();
        await fetchRooms(false);
      }
    } catch (err) {
      console.error("Release room failed:", err);
      setActionAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to release room.",
      });
    } finally {
      setActionLoading(false);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const windowStatus = stateData?.window?.status || "none";
  const eligibility = stateData?.eligibility || { canSelect: false, reason: "Loading..." };
  const releaseEligibility = stateData?.releaseEligibility || { canRelease: false };
  const currentClaim = stateData?.currentClaim;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔑</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Room Selection Window
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            First-Come, First-Served room claiming with immediate allocation lock.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 self-start sm:self-auto"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      {actionAlert && (
        <Alert
          type={actionAlert.type}
          message={actionAlert.message}
          onClose={() => setActionAlert(null)}
        />
      )}

      {/* Window Status Banner */}
      <div className={`rounded-3xl p-6 sm:p-8 text-white shadow-lg ${
        windowStatus === "open"
          ? "bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800"
          : windowStatus === "scheduled"
          ? "bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900"
          : windowStatus === "closed"
          ? "bg-gradient-to-r from-amber-700 via-orange-800 to-slate-900"
          : windowStatus === "finalized"
          ? "bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-950"
          : "bg-gradient-to-r from-slate-700 to-slate-900"
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <span className={`h-2.5 w-2.5 rounded-full ${windowStatus === "open" ? "bg-emerald-300 animate-ping" : "bg-white"}`} />
              Window Status: {windowStatus}
            </div>

            <h2 className="text-xl sm:text-2xl font-black">
              {windowStatus === "open" && "Room Selection is LIVE!"}
              {windowStatus === "scheduled" && "Upcoming Selection Window"}
              {windowStatus === "closed" && "Selection Window Closed"}
              {windowStatus === "finalized" && "Room Selection Finalized"}
              {windowStatus === "none" && "No Active Selection Window"}
            </h2>

            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
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
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center shrink-0 min-w-[160px] backdrop-blur-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 block">
                {windowStatus === "open" ? "Closes In" : "Opens In"}
              </span>
              <div className="text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                {String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
              </div>
              <span className="text-[10px] text-white/60 block mt-0.5">minutes : seconds</span>
            </div>
          )}
        </div>
      </div>

      {/* Currently Claimed Room Banner */}
      {currentClaim && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/90 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white text-2xl shrink-0 shadow-xs">
                ✓
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md">
                    Your Unit Selected
                  </span>
                  <h3 className="text-lg font-black text-emerald-950">
                    Room #{currentClaim.room?.roomNumber} ({currentClaim.hostel?.name})
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-emerald-900 mt-1">
                  Floor {currentClaim.room?.floor} • {currentClaim.room?.roomType} • {currentClaim.room?.capacity} Beds
                  {currentClaim.openSeats > 0 && (
                    <span className="font-semibold text-emerald-700 ml-2">
                      ({currentClaim.openSeats} seat{currentClaim.openSeats > 1 ? "s" : ""} remaining for your group)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Claimed at {new Date(currentClaim.claimedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {releaseEligibility.canRelease && (
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
            )}
          </div>
        </div>
      )}

      {/* Eligibility Warning Banner (if not eligible to select) */}
      {!eligibility.canSelect && !currentClaim && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 flex items-start gap-3">
          <span className="text-lg">ℹ️</span>
          <div>
            <span className="font-bold block">Selection Notice:</span>
            <span>{eligibility.reason}</span>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Hostel Filter */}
          <div className="flex items-center gap-1.5">
            <label className="font-semibold text-slate-600">Hostel:</label>
            <select
              value={selectedHostel}
              onChange={(e) => {
                setSelectedHostel(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white focus:outline-indigo-500"
            >
              <option value="">All Eligible Hostels</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          </div>

          {/* Room Type Filter */}
          <div className="flex items-center gap-1.5">
            <label className="font-semibold text-slate-600">AC Type:</label>
            <select
              value={selectedRoomType}
              onChange={(e) => {
                setSelectedRoomType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white focus:outline-indigo-500"
            >
              <option value="">All Types</option>
              <option value="AC">AC</option>
              <option value="Non-AC">Non-AC</option>
            </select>
          </div>

          {/* Floor Filter */}
          <div className="flex items-center gap-1.5">
            <label className="font-semibold text-slate-600">Floor:</label>
            <select
              value={selectedFloor}
              onChange={(e) => {
                setSelectedFloor(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white focus:outline-indigo-500"
            >
              <option value="">All Floors</option>
              <option value="0">Ground Floor (0)</option>
              <option value="1">1st Floor</option>
              <option value="2">2nd Floor</option>
              <option value="3">3rd Floor</option>
              <option value="4">4th Floor+</option>
            </select>
          </div>

          {(selectedHostel || selectedRoomType || selectedFloor !== "") && (
            <button
              onClick={() => {
                setSelectedHostel("");
                setSelectedRoomType("");
                setSelectedFloor("");
                setPage(1);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline ml-1"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-3">
          <span>
            Showing <strong>{rooms.length}</strong> of <strong>{totalRooms}</strong> free rooms
          </span>
          {windowStatus === "open" && (
            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Polling (20s)
            </span>
          )}
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <span className="text-4xl">🚪</span>
          <h3 className="text-base font-bold text-slate-800">No Selectable Rooms Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No free rooms matching your unit&apos;s gender, room size, and active filters are currently available. Check back as other students release rooms or broaden your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isCurrentSelected = currentClaim?.room?.id === room.id;
            const canPick = eligibility.canSelect && windowStatus === "open" && !isCurrentSelected;

            return (
              <div
                key={room.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all bg-white ${
                  isCurrentSelected
                    ? "border-emerald-500 ring-2 ring-emerald-400/30 shadow-md"
                    : "border-slate-200 hover:border-indigo-400 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Top Bar: Hostel Name and Full Match Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-700 truncate" title={room.hostelName}>
                      {room.hostelName}
                    </span>
                    {room.matchScore === 100 && (
                      <Badge variant="emerald" size="sm">
                        Full Match
                      </Badge>
                    )}
                  </div>

                  {/* Room Number & Floor */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      Room #{room.roomNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Floor {room.floor}
                    </span>
                  </div>

                  {/* Specifications & Preference Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-semibold">
                      {room.roomType}
                    </span>
                    <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-semibold">
                      {room.capacity} Bed{room.capacity > 1 ? "s" : ""}
                    </span>

                    {room.matchesHostel && (
                      <span className="rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold">
                        ★ Preferred Hostel
                      </span>
                    )}
                    {room.matchesAc && (
                      <span className="rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-bold">
                        ✓ AC Match
                      </span>
                    )}
                    {room.matchesFloor && (
                      <span className="rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
                        ✓ Floor Match
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Area */}
                <div className="pt-3 border-t border-slate-100 mt-2">
                  {isCurrentSelected ? (
                    <div className="text-center py-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 rounded-xl">
                      ✓ Your Selected Room
                    </div>
                  ) : (
                    <Button
                      variant={canPick ? "primary" : "secondary"}
                      size="sm"
                      fullWidth
                      disabled={!canPick || actionLoading}
                      onClick={() => {
                        setSelectingRoom(room);
                        setConfirmDialog({
                          isOpen: true,
                          title: `Claim Room #${room.roomNumber}?`,
                          message: `Confirm claiming Room #${room.roomNumber} in ${room.hostelName} (${room.capacity}-Bed ${room.roomType}). On confirmation, this room is immediately and finally reserved for your unit on a First-Come, First-Served basis.`,
                          variant: "primary",
                          action: () => handleSelectRoom(room),
                        });
                      }}
                    >
                      {windowStatus !== "open"
                        ? "Window Closed"
                        : !eligibility.canSelect
                        ? "Unavailable"
                        : "Claim Room"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              &larr; Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText="Confirm &amp; Proceed"
        cancelText="Cancel"
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

