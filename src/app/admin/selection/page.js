"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import {
  PageContainer,
  Card,
  Badge,
  Button,
  ConfirmDialog,
  Modal,
  Alert,
  CountdownBadge,
  AnimatedNumber,
  Input,
} from "@/components/ui";
import {
  AdminPageHeader,
  StatusBadge,
  ConfirmTypeDialog,
} from "@/components/admin";
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
        type: "danger",
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
        type: "danger",
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
        type: "danger",
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
        type: "danger",
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
      const res = await axios.get("/api/admin/selection/finalize-preview");
      if (res.data?.success) {
        setFinalizePreview(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load finalize preview:", err);
      setActionAlert({
        type: "danger",
        message: err.response?.data?.message || "Failed to load finalize preview",
      });
      setIsFinalizeOpen(false);
    } finally {
      setFinalizePreviewLoading(false);
    }
  };

  // Action: Confirm Finalize
  const handleConfirmFinalize = async () => {
    try {
      setFinalizing(true);
      setActionAlert(null);
      const res = await axios.post("/api/admin/selection/finalize", {
        confirmText: FINALIZE_CONFIRM_TEXT,
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
        type: "danger",
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
        type: "danger",
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
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Header */}
      <AdminPageHeader
        title="Room Selection Window Console"
        description="Real-time management for First-Come, First-Served room picking, locks, and finalization."
        breadcrumbs={[{ label: "Selection Window" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {windowStatus === "open" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExtendOpen(true)}
                  disabled={actionLoading}
                >
                  ⏱️ Extend Window
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCloseNow}
                  isLoading={actionLoading}
                >
                  Close Window Now
                </Button>
              </>
            ) : windowStatus === "scheduled" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenNow}
                isLoading={actionLoading}
              >
                🚀 Open Window Now
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
        }
      />

      {actionAlert && (
        <div className="mb-6">
          <Alert
            variant={actionAlert.type}
            title={actionAlert.type === "success" ? "Success" : "Notice"}
            onClose={() => setActionAlert(null)}
          >
            {actionAlert.message}
          </Alert>
        </div>
      )}

      {error && (
        <div className="mb-6">
          <Alert variant="danger" title="Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {/* Prominent Window Status Card */}
      <div
        className={`rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-6 ${
          windowStatus === "open"
            ? "bg-gradient-to-r from-teal-700 via-indigo-900 to-indigo-950 border border-teal-500/40"
            : windowStatus === "scheduled"
            ? "bg-gradient-to-r from-blue-700 via-indigo-900 to-slate-900 border border-blue-500/40"
            : windowStatus === "closed"
            ? "bg-gradient-to-r from-amber-700 via-orange-900 to-slate-950 border border-amber-500/40"
            : windowStatus === "finalized"
            ? "bg-gradient-to-r from-purple-900 via-slate-900 to-slate-950 border border-purple-500/40"
            : "bg-slate-900 border border-slate-800"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge type="window" status={windowStatus} />
              {windowStatus === "open" && windowDoc?.endsAt && (
                <CountdownBadge
                  targetDate={windowDoc.endsAt}
                  label="Closes in"
                />
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black font-heading">
              {windowDoc?.name || "No Active Selection Window"}
            </h2>

            <p className="text-xs sm:text-sm text-white/80 max-w-xl leading-relaxed">
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

          {windowStatus === "open" && windowDoc?.endsAt && (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center shrink-0 min-w-[170px] backdrop-blur-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200 block">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Rooms</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 block">
              <AnimatedNumber value={overview.roomCounts?.total || 0} />
            </span>
            <span className="text-[10px] text-slate-400">Campus inventory</span>
          </Card>

          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Claimed Rooms</span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
              <AnimatedNumber value={overview.roomCounts?.claimed || 0} />
            </span>
            <span className="text-[10px] text-indigo-500 font-semibold">FCFS active holds</span>
          </Card>

          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Available Rooms</span>
            <span className="text-xl font-bold text-teal-600 dark:text-teal-400 font-mono mt-1 block">
              <AnimatedNumber value={overview.roomCounts?.available || 0} />
            </span>
            <span className="text-[10px] text-teal-500 font-semibold">Ready to claim</span>
          </Card>

          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Reserved Beds</span>
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono mt-1 block">
              <AnimatedNumber value={overview.bedCounts?.reserved || 0} />
            </span>
            <span className="text-[10px] text-slate-400">In claimed rooms</span>
          </Card>

          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Open Seats</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1 block">
              <AnimatedNumber value={overview.unitCounts?.openSeatsInClaimedRooms || 0} />
            </span>
            <span className="text-[10px] text-amber-600 font-semibold">To be auto-filled</span>
          </Card>

          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Groups With Room</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1 block">
              <AnimatedNumber value={overview.unitCounts?.groupsWithRoom || 0} />
            </span>
            <span className="text-[10px] text-slate-400">Claimed successfully</span>
          </Card>

          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Groups Waiting</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono mt-1 block">
              <AnimatedNumber value={overview.unitCounts?.groupsWithoutRoom || 0} />
            </span>
            <span className="text-[10px] text-rose-500 font-semibold">Eligible to pick</span>
          </Card>
        </div>
      )}

      {/* Claimed Rooms Table */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
              Active Room Claims ({overview?.claimedRooms?.length || 0})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rooms currently claimed by student group leaders during open selection windows.
            </p>
          </div>
        </div>

        {overview?.claimedRooms?.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 py-10">
            No rooms have been claimed yet in this selection cycle.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {overview?.claimedRooms?.map((cr) => (
                  <tr key={cr.roomId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 font-mono">
                      #{cr.roomNumber}
                    </td>
                    <td className="px-4 py-3">
                      {cr.hostelName} <span className="text-slate-400 dark:text-slate-500">({cr.hostelCode})</span>
                    </td>
                    <td className="px-4 py-3">
                      {cr.roomType} • Floor {cr.floor}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {cr.capacity} Beds
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">{cr.currentOccupancy}</span> / {cr.capacity}
                      {cr.openSeats > 0 && (
                        <span className="ml-2">
                          <Badge variant="warning" size="xs">
                            {cr.openSeats} Open Seat{cr.openSeats > 1 ? "s" : ""}
                          </Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cr.claimedByGroup ? (
                        <Link
                          href={`/admin/groups/${cr.claimedByGroup.id}`}
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Group #{cr.claimedByGroup.id.slice(-6).toUpperCase()}
                          {cr.claimedByGroup.leader && ` (${cr.claimedByGroup.leader.name})`}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {cr.claimedAt ? new Date(cr.claimedAt).toLocaleTimeString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {cr.claimedByGroup && (
                        <button
                          type="button"
                          onClick={() =>
                            setReleaseTarget({
                              groupId: cr.claimedByGroup.id,
                              roomNumber: cr.roomNumber,
                            })
                          }
                          className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
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
      </Card>

      {/* Schedule Window Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule Selection Window"
        description="Set the date and time boundaries when student group leaders can browse and claim rooms."
      >
        <form onSubmit={handleCreateWindow} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Window Title</label>
            <Input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Starts At</label>
            <Input
              type="datetime-local"
              value={createForm.startsAt}
              onChange={(e) => setCreateForm({ ...createForm, startsAt: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Ends At</label>
            <Input
              type="datetime-local"
              value={createForm.endsAt}
              onChange={(e) => setCreateForm({ ...createForm, endsAt: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={actionLoading}>
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
        description="Add more time to the currently active selection window."
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Choose how many minutes to add to the current window closing time:
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {[15, 30, 60, 120].map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setExtendMinutes(min)}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  extendMinutes === min
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                +{min} min
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setIsExtendOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleExtendWindow} isLoading={actionLoading}>
              Extend Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Finalize Selection ConfirmTypeDialog */}
      <ConfirmTypeDialog
        isOpen={isFinalizeOpen}
        onClose={() => setIsFinalizeOpen(false)}
        onConfirm={handleConfirmFinalize}
        title="Finalize Selection Window & Auto-Fill Open Seats"
        description="This action locks all roomed groups, runs the deterministic open-seat auto-fill engine for claimed rooms with vacant spots, and closes the selection window."
        requiredWord={FINALIZE_CONFIRM_TEXT}
        confirmButtonText="Execute Finalization"
        variant="warning"
        isLoading={finalizing}
        items={[
          `${finalizePreview?.groupsToLock?.length || 0} roomed groups will be locked immediately.`,
          `${finalizePreview?.openSeatsToFill?.length || 0} open seats planned to be auto-filled with compatible candidates.`,
          `${finalizePreview?.unallocatedEligibleCount || 0} unplaced students will remain for the fallback allocation simulation.`,
        ]}
      />

      {/* Release Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(releaseTarget)}
        onClose={() => setReleaseTarget(null)}
        onConfirm={handleReleaseRoom}
        title="Admin Release Room Override"
        message={`Are you sure you want to release Room #${releaseTarget?.roomNumber}? Active allocations will be deleted, and the room will immediately become available again.`}
        confirmText="Release Room"
        variant="danger"
        isLoading={releasing}
      />
    </PageContainer>
  );
}
