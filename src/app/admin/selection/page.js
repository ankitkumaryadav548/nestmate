"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import { FINALIZE_CONFIRM_TEXT } from "@/config/selection";

export default function AdminSelectionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "General Room Selection Window",
    startsAt: "",
    endsAt: "",
  });

  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(30);

  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [finalizePreview, setFinalizePreview] = useState(null);
  const [finalizePreviewLoading, setFinalizePreviewLoading] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releasing, setReleasing] = useState(false);

  // Quick action loading state
  const [actionLoading, setActionLoading] = useState(false);

  const pollIntervalRef = useRef(null);

  const fetchData = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      setError(null);
      const res = await axios.get("/api/admin/selection");
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load selection dashboard:", err);
      if (!isPolling) {
        setError(err.response?.data?.message || "Failed to load selection dashboard data.");
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-poll every 15 seconds to keep live metrics updated
    pollIntervalRef.current = setInterval(() => {
      fetchData(true);
    }, 15000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchData]);

  // Quick Action: Open Now
  const handleOpenNow = async () => {
    try {
      setActionLoading(true);
      setActionAlert(null);
      await axios.patch("/api/admin/selection/window", {
        action: "open-now",
        minutes: 60,
      });
      setActionAlert({ type: "success", message: "Selection window opened for 60 minutes!" });
      await fetchData();
    } catch (err) {
      setActionAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to open window",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Close Now
  const handleCloseNow = async () => {
    try {
      setActionLoading(true);
      setActionAlert(null);
      await axios.patch("/api/admin/selection/window", {
        action: "close-now",
      });
      setActionAlert({ type: "success", message: "Selection window closed successfully." });
      await fetchData();
    } catch (err) {
      setActionAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to close window",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Extend Window
  const handleExtendWindow = async () => {
    try {
      setActionLoading(true);
      setActionAlert(null);
      await axios.patch("/api/admin/selection/window", {
        action: "extend",
        minutes: Number(extendMinutes),
      });
      setActionAlert({
        type: "success",
        message: `Selection window extended by ${extendMinutes} minutes.`,
      });
      setIsExtendOpen(false);
      await fetchData();
    } catch (err) {
      setActionAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to extend window",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Schedule/Create Window
  const handleCreateWindow = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionAlert(null);
      await axios.post("/api/admin/selection/window", {
        name: createForm.name,
        startsAt: new Date(createForm.startsAt),
        endsAt: new Date(createForm.endsAt),
      });
      setActionAlert({ type: "success", message: "New selection window scheduled successfully." });
      setIsCreateOpen(false);
      await fetchData();
    } catch (err) {
      setActionAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to create selection window",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Open Finalize Preview
  const handleOpenFinalizeModal = async () => {
    try {
      setFinalizePreviewLoading(true);
      setIsFinalizeOpen(true);
      setConfirmInput("");
      const res = await axios.get("/api/admin/selection/finalize-preview");
      if (res.data?.success) {
        setFinalizePreview(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load finalize preview:", err);
      setActionAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to load finalize preview",
      });
      setIsFinalizeOpen(false);
    } finally {
      setFinalizePreviewLoading(false);
    }
  };

  // Action: Confirm Finalize
  const handleConfirmFinalize = async () => {
    if (confirmInput !== FINALIZE_CONFIRM_TEXT) return;
    try {
      setFinalizing(true);
      setActionAlert(null);
      const res = await axios.post("/api/admin/selection/finalize", {
        confirmText: confirmInput,
      });
      if (res.data?.success) {
        setActionAlert({
          type: "success",
          message: `Selection finalized! Locked ${res.data.data.lockedCount} groups and auto-filled ${res.data.data.autoFilledCount} open seats.`,
        });
        setIsFinalizeOpen(false);
        await fetchData();
      }
    } catch (err) {
      console.error("Finalize error:", err);
      setActionAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to finalize selection",
      });
    } finally {
      setFinalizing(false);
    }
  };

  // Action: Release Room Override
  const handleReleaseRoom = async () => {
    if (!releaseTarget) return;
    try {
      setReleasing(true);
      setActionAlert(null);
      await axios.post(`/api/admin/groups/${releaseTarget.groupId}/release-room`);
      setActionAlert({
        type: "success",
        message: `Room #${releaseTarget.roomNumber} released by admin override.`,
      });
      setReleaseTarget(null);
      await fetchData();
    } catch (err) {
      console.error("Release error:", err);
      setActionAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to release room",
      });
    } finally {
      setReleasing(false);
    }
  };

  const windowDoc = data?.window;
  const overview = data?.overview;
  const windowStatus = windowDoc?.status || "none";

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin" className="hover:text-indigo-600">Admin</Link>
            <span>/</span>
            <span className="text-slate-800">Selection Window</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Room Selection Window Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time management for First-Come, First-Served room picking, locks, and finalization.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {windowStatus === "open" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExtendOpen(true)}
                disabled={actionLoading}
              >
                ⏱️ Extend (+Min)
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCloseNow}
                loading={actionLoading}
              >
                Close Window Now
              </Button>
            </>
          ) : windowStatus === "scheduled" ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenNow}
              loading={actionLoading}
            >
              🚀 Open Window Immediately
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000);
                setCreateForm({
                  name: "General Student Room Selection Window",
                  startsAt: now.toISOString().slice(0, 16),
                  endsAt: defaultEnd.toISOString().slice(0, 16),
                });
                setIsCreateOpen(true);
              }}
            >
              + Schedule Window
            </Button>
          )}

          {windowStatus !== "finalized" && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenFinalizeModal}
              disabled={actionLoading}
            >
              🔒 Finalize Selection &amp; Auto-Fill
            </Button>
          )}
        </div>
      </div>

      {actionAlert && (
        <Alert
          type={actionAlert.type}
          message={actionAlert.message}
          onClose={() => setActionAlert(null)}
        />
      )}

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Window Status Card */}
      <div className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl ${
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <span className={`h-2.5 w-2.5 rounded-full ${windowStatus === "open" ? "bg-emerald-300 animate-ping" : "bg-white"}`} />
              Window: {windowStatus.toUpperCase()}
            </div>
            <h2 className="text-xl sm:text-2xl font-black">
              {windowDoc?.name || "No Active Selection Window"}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              {windowDoc ? (
                <>
                  Starts: <strong>{new Date(windowDoc.startsAt).toLocaleString()}</strong> • Ends:{" "}
                  <strong>{new Date(windowDoc.endsAt).toLocaleString()}</strong>
                  {windowDoc.closedAt && (
                    <> (Closed at {new Date(windowDoc.closedAt).toLocaleTimeString()})</>
                  )}
                  {windowDoc.finalizedAt && (
                    <> • Finalized at {new Date(windowDoc.finalizedAt).toLocaleString()}</>
                  )}
                </>
              ) : (
                "Schedule a selection window to allow student group leaders to browse and claim rooms in real time."
              )}
            </p>
          </div>

          {windowStatus === "open" && (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center shrink-0 min-w-[160px] backdrop-blur-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200 block">
                Window Closes At
              </span>
              <div className="text-2xl font-black font-mono tracking-tight text-white mt-1">
                {new Date(windowDoc.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Overview Grid */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Total Rooms</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {overview.roomCounts?.total || 0}
            </span>
            <span className="text-[10px] text-slate-400">Campus inventory</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Claimed Rooms</span>
            <span className="text-xl font-black text-indigo-600 mt-1 block">
              {overview.roomCounts?.claimed || 0}
            </span>
            <span className="text-[10px] text-indigo-500 font-semibold">Active FCFS holds</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Available Rooms</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">
              {overview.roomCounts?.available || 0}
            </span>
            <span className="text-[10px] text-emerald-500 font-semibold">Ready to claim</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Reserved Beds</span>
            <span className="text-xl font-black text-purple-600 mt-1 block">
              {overview.bedCounts?.reserved || 0}
            </span>
            <span className="text-[10px] text-slate-400">In claimed rooms</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Open Seats</span>
            <span className="text-xl font-black text-amber-600 mt-1 block">
              {overview.unitCounts?.openSeatsInClaimedRooms || 0}
            </span>
            <span className="text-[10px] text-amber-600 font-semibold">To be auto-filled</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Units Placed</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {overview.unitCounts?.groupsWithRoom || 0}
            </span>
            <span className="text-[10px] text-slate-400">Groups with rooms</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Unplaced Groups</span>
            <span className="text-xl font-black text-rose-600 mt-1 block">
              {overview.unitCounts?.groupsWithoutRoom || 0}
            </span>
            <span className="text-[10px] text-rose-500 font-semibold">Eligible to pick</span>
          </div>
        </div>
      )}

      {/* Claimed Rooms Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Active Room Claims ({overview?.claimedRooms?.length || 0})
            </h3>
            <p className="text-xs text-slate-500">
              Rooms currently claimed by group leaders during selection windows.
            </p>
          </div>
        </div>

        {overview?.claimedRooms?.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No rooms have been claimed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Hostel</th>
                  <th className="px-4 py-3">Type &amp; Floor</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Occupancy / Open Seats</th>
                  <th className="px-4 py-3">Claimed Group / Leader</th>
                  <th className="px-4 py-3">Claimed At</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {overview?.claimedRooms?.map((cr) => (
                  <tr key={cr.roomId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      Room #{cr.roomNumber}
                    </td>
                    <td className="px-4 py-3">
                      {cr.hostelName} <span className="text-slate-400">({cr.hostelCode})</span>
                    </td>
                    <td className="px-4 py-3">
                      {cr.roomType} • Floor {cr.floor}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {cr.capacity} Beds
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{cr.currentOccupancy}</span> / {cr.capacity}
                      {cr.openSeats > 0 && (
                        <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {cr.openSeats} Open Seat{cr.openSeats > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cr.claimedByGroup ? (
                        <Link
                          href={`/admin/groups/${cr.claimedByGroup.id}`}
                          className="font-bold text-indigo-600 hover:underline"
                        >
                          Group #{cr.claimedByGroup.id.slice(-6).toUpperCase()}
                          {cr.claimedByGroup.leader && ` (${cr.claimedByGroup.leader.name})`}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {cr.claimedAt ? new Date(cr.claimedAt).toLocaleTimeString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {cr.claimedByGroup && (
                        <button
                          onClick={() =>
                            setReleaseTarget({
                              groupId: cr.claimedByGroup.id,
                              roomNumber: cr.roomNumber,
                            })
                          }
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 underline"
                        >
                          Release
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Window Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule Selection Window"
      >
        <form onSubmit={handleCreateWindow} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Window Title</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-indigo-500"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Starts At</label>
            <input
              type="datetime-local"
              value={createForm.startsAt}
              onChange={(e) => setCreateForm({ ...createForm, startsAt: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-indigo-500"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Ends At</label>
            <input
              type="datetime-local"
              value={createForm.endsAt}
              onChange={(e) => setCreateForm({ ...createForm, endsAt: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-indigo-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={actionLoading}>
              Schedule Window
            </Button>
          </div>
        </form>
      </Modal>

      {/* Extend Window Modal */}
      <Modal
        isOpen={isExtendOpen}
        onClose={() => setIsExtendOpen(false)}
        title="Extend Selection Window"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Choose how many minutes to add to the current window closing time:
          </p>
          <div className="flex items-center gap-3">
            {[15, 30, 60, 120].map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setExtendMinutes(min)}
                className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                  extendMinutes === min
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                +{min} min
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsExtendOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleExtendWindow} loading={actionLoading}>
              Extend Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Finalize Preview & Execution Modal */}
      <Modal
        isOpen={isFinalizeOpen}
        onClose={() => setIsFinalizeOpen(false)}
        title="Finalize Selection Window & Auto-Fill Open Seats"
      >
        <div className="space-y-4 text-xs">
          {finalizePreviewLoading ? (
            <div className="py-8 text-center text-slate-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="mt-2">Computing deterministic auto-fill preview...</p>
            </div>
          ) : finalizePreview ? (
            <>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 space-y-2">
                <h4 className="font-bold text-indigo-950">Finalization Plan Preview:</h4>
                <ul className="list-disc list-inside text-indigo-900 space-y-1">
                  <li>
                    <strong>{finalizePreview.groupsToLock?.length || 0}</strong> roomed groups will be locked immediately.
                  </li>
                  <li>
                    <strong>{finalizePreview.openSeatsToFill?.length || 0}</strong> open seats planned to be auto-filled with compatible candidates.
                  </li>
                  <li>
                    <strong>{finalizePreview.unallocatedEligibleCount || 0}</strong> unplaced students will remain for the fallback allocation simulation.
                  </li>
                </ul>
              </div>

              {finalizePreview.openSeatsToFill?.length > 0 && (
                <div>
                  <h5 className="font-bold text-slate-800 mb-2">Planned Seat Fills:</h5>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                    {finalizePreview.openSeatsToFill.map((fill, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{fill.studentName}</span>
                          <span className="text-slate-400 ml-1.5">
                            &rarr; Room #{fill.roomNumber} ({fill.hostelName})
                          </span>
                        </div>
                        <Badge variant="emerald" size="sm">
                          {fill.compatibilityAverage}% Match
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                <span className="font-bold block mb-1">Confirmation Required:</span>
                <p className="text-[11px]">
                  This action closes the window, locks roomed groups, and executes auto-fill additions. To proceed, please type <strong>{FINALIZE_CONFIRM_TEXT}</strong> below:
                </p>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={FINALIZE_CONFIRM_TEXT}
                  className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setIsFinalizeOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={confirmInput !== FINALIZE_CONFIRM_TEXT || finalizing}
                  loading={finalizing}
                  onClick={handleConfirmFinalize}
                >
                  Execute Finalization
                </Button>
              </div>
            </>
          ) : (
            <p className="text-rose-600">Failed to load preview.</p>
          )}
        </div>
      </Modal>

      {/* Release Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(releaseTarget)}
        onClose={() => setReleaseTarget(null)}
        onConfirm={handleReleaseRoom}
        title="Admin Release Room Override"
        message={`Are you sure you want to release Room #${releaseTarget?.roomNumber}? Active allocations will be deleted, and the room will immediately become available again.`}
        confirmText="Release Room"
        confirmVariant="danger"
        loading={releasing}
      />
    </div>
  );
}

