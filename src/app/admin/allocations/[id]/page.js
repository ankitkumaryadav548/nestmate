"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import { WAITLIST_REASONS, UNALLOCATED_REASONS } from "@/config/allocation";

export default function AdminAllocationResultPage({ params }) {
  const unwrappedParams = use(params);
  const runId = unwrappedParams.id;

  const [run, setRun] = useState(null);
  const [loadingRun, setLoadingRun] = useState(true);
  const [runError, setRunError] = useState(null);

  // Assignments filter & pagination state
  const [assignments, setAssignments] = useState([]);
  const [assignmentsPagination, setAssignmentsPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [hostelFilter, setHostelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Unallocated modal or expand state
  const [unallocatedList, setUnallocatedList] = useState([]);
  const [loadingUnallocated, setLoadingUnallocated] = useState(false);
  const [showUnallocated, setShowUnallocated] = useState(false);

  // Publication & Rollback Modal State
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishPreview, setPublishPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [publishConfirmText, setPublishConfirmText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);

  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [rollbackConfirmText, setRollbackConfirmText] = useState("");
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState(null);

  // Edit Action Modals State
  const [activeEditModal, setActiveEditModal] = useState(null); // "move" | "swap_rooms" | "swap_members" | "assign_waitlisted"
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [editOptions, setEditOptions] = useState(null);
  const [loadingEditOptions, setLoadingEditOptions] = useState(false);
  const [editActionLoading, setEditActionLoading] = useState(false);
  const [editModalError, setEditModalError] = useState(null);

  // Swap Members State
  const [swapMemberA, setSwapMemberA] = useState("");
  const [swapUnitB, setSwapUnitB] = useState("");
  const [swapMemberB, setSwapMemberB] = useState("");
  const [swapOverrideRequired, setSwapOverrideRequired] = useState(false);
  const [swapConflictingPairs, setSwapConflictingPairs] = useState([]);
  const [confirmOverrideChecked, setConfirmOverrideChecked] = useState(false);
  const [overrideReasonText, setOverrideReasonText] = useState("");

  // Unassign Confirm
  const [unassignUnitId, setUnassignUnitId] = useState(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  // Edit History Panel State
  const [showEditLog, setShowEditLog] = useState(false);

  // Fetch Run Metadata & Compiled Stats
  const fetchRun = useCallback(async () => {
    setLoadingRun(true);
    setRunError(null);
    try {
      const res = await axios.get(`/api/admin/allocations/${runId}`);
      if (res.data?.success) {
        setRun(res.data.data);
      }
    } catch (err) {
      setRunError(err.response?.data?.message || err.message || "Failed to load allocation run");
    } finally {
      setLoadingRun(false);
    }
  }, [runId]);

  // Fetch Paginated Assignments
  const fetchAssignments = useCallback(
    async (page = 1) => {
      setLoadingAssignments(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          limit: "15",
          status: statusFilter,
          hostelId: hostelFilter,
          search: searchQuery,
        });
        const res = await axios.get(`/api/admin/allocations/${runId}/assignments?${queryParams.toString()}`);
        if (res.data?.success) {
          setAssignments(res.data.data.assignments || []);
          setAssignmentsPagination(res.data.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error("Failed to load assignments", err);
      } finally {
        setLoadingAssignments(false);
      }
    },
    [runId, statusFilter, hostelFilter, searchQuery]
  );

  // Fetch Unallocated students
  const fetchUnallocated = useCallback(async () => {
    setLoadingUnallocated(true);
    try {
      const res = await axios.get(`/api/admin/allocations/${runId}/unallocated`);
      if (res.data?.success) {
        setUnallocatedList(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load unallocated students", err);
    } finally {
      setLoadingUnallocated(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  useEffect(() => {
    fetchAssignments(1);
  }, [fetchAssignments]);

  useEffect(() => {
    if (showUnallocated && unallocatedList.length === 0) {
      fetchUnallocated();
    }
  }, [showUnallocated, unallocatedList.length, fetchUnallocated]);

  // Handle Publish Preview Load
  const handleOpenPublishModal = async () => {
    setPublishModalOpen(true);
    setPublishPreview(null);
    setPublishConfirmText("");
    setPublishError(null);
    setLoadingPreview(true);

    try {
      const res = await axios.get(`/api/admin/allocations/${runId}/publish-preview`);
      if (res.data?.success) {
        setPublishPreview(res.data.data);
      }
    } catch (err) {
      setPublishError(err.response?.data?.message || "Failed to load publication preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Submit Publish
  const handleExecutePublish = async (e) => {
    e.preventDefault();
    if (publishConfirmText !== "PUBLISH") return;

    setIsPublishing(true);
    setPublishError(null);
    try {
      const res = await axios.post(`/api/admin/allocations/${runId}/publish`, {
        confirmText: "PUBLISH",
      });
      if (res.data?.success) {
        setPublishModalOpen(false);
        fetchRun();
        fetchAssignments(1);
      }
    } catch (err) {
      setPublishError(err.response?.data?.message || "Publication failed");
    } finally {
      setIsPublishing(false);
    }
  };

  // Submit Rollback
  const handleExecuteRollback = async (e) => {
    e.preventDefault();
    if (rollbackConfirmText !== "ROLLBACK") return;

    setIsRollingBack(true);
    setRollbackError(null);
    try {
      const res = await axios.post(`/api/admin/allocations/${runId}/rollback`, {
        confirmText: "ROLLBACK",
      });
      if (res.data?.success) {
        setRollbackModalOpen(false);
        fetchRun();
        fetchAssignments(1);
      }
    } catch (err) {
      setRollbackError(err.response?.data?.message || "Rollback failed");
    } finally {
      setIsRollingBack(false);
    }
  };

  // Open Edit Modals and fetch candidate options
  const handleOpenEditModal = async (unit, mode) => {
    setSelectedUnit(unit);
    setActiveEditModal(mode);
    setEditOptions(null);
    setEditModalError(null);
    setLoadingEditOptions(true);

    // Reset swap state
    setSwapMemberA(unit.members?.[0]?._id || "");
    setSwapUnitB("");
    setSwapMemberB("");
    setSwapOverrideRequired(false);
    setSwapConflictingPairs([]);
    setConfirmOverrideChecked(false);
    setOverrideReasonText("");

    try {
      const res = await axios.get(
        `/api/admin/allocations/${runId}/edit-options?unitId=${unit._id}&mode=${mode}`
      );
      if (res.data?.success) {
        setEditOptions(res.data.data);
      }
    } catch (err) {
      setEditModalError(err.response?.data?.message || "Failed to load options");
    } finally {
      setLoadingEditOptions(false);
    }
  };

  // Submit Move or Assign Waitlisted
  const handleExecuteMoveOrAssign = async (targetRoomId) => {
    setEditActionLoading(true);
    setEditModalError(null);
    const action = activeEditModal === "assign_waitlisted" ? "assign_waitlisted" : "move";

    try {
      await axios.post(`/api/admin/allocations/${runId}/edit`, {
        action,
        params: {
          unitId: selectedUnit._id,
          targetRoomId,
        },
      });

      setActiveEditModal(null);
      fetchRun();
      fetchAssignments(assignmentsPagination.page);
    } catch (err) {
      setEditModalError(err.response?.data?.message || "Action failed");
    } finally {
      setEditActionLoading(false);
    }
  };

  // Submit Swap Rooms
  const handleExecuteSwapRooms = async (partnerUnitId) => {
    setEditActionLoading(true);
    setEditModalError(null);
    try {
      await axios.post(`/api/admin/allocations/${runId}/edit`, {
        action: "swap_rooms",
        params: {
          unitIdA: selectedUnit._id,
          unitIdB: partnerUnitId,
        },
      });

      setActiveEditModal(null);
      fetchRun();
      fetchAssignments(assignmentsPagination.page);
    } catch (err) {
      setEditModalError(err.response?.data?.message || "Room swap failed");
    } finally {
      setEditActionLoading(false);
    }
  };

  // Submit Swap Members
  const handleExecuteSwapMembers = async (e) => {
    if (e) e.preventDefault();
    if (!swapMemberA || !swapUnitB || !swapMemberB) {
      setEditModalError("Please select students from both units to swap");
      return;
    }

    setEditActionLoading(true);
    setEditModalError(null);

    try {
      const res = await axios.post(`/api/admin/allocations/${runId}/edit`, {
        action: "swap_members",
        params: {
          unitIdA: selectedUnit._id,
          memberIdA: swapMemberA,
          unitIdB: swapUnitB,
          memberIdB: swapMemberB,
        },
        confirmOverride: confirmOverrideChecked,
        overrideReason: overrideReasonText.trim(),
      });

      if (res.data?.success) {
        setActiveEditModal(null);
        fetchRun();
        fetchAssignments(assignmentsPagination.page);
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.details?.requiresOverride || err.response?.status === 409) {
        setSwapOverrideRequired(true);
        setSwapConflictingPairs(resp?.details?.conflictingPairs || []);
        setEditModalError(resp?.message || "Lifestyle deal-breaker conflict detected. Check override to proceed.");
      } else {
        setEditModalError(resp?.message || err.message || "Failed to swap members");
      }
    } finally {
      setEditActionLoading(false);
    }
  };

  // Submit Unassign Unit
  const handleExecuteUnassign = async () => {
    if (!unassignUnitId) return;
    setIsUnassigning(true);
    try {
      await axios.post(`/api/admin/allocations/${runId}/edit`, {
        action: "unassign",
        params: { unitId: unassignUnitId },
      });
      setUnassignUnitId(null);
      fetchRun();
      fetchAssignments(assignmentsPagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to unassign unit");
    } finally {
      setIsUnassigning(false);
    }
  };

  if (loadingRun) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">Loading allocation run results...</p>
      </div>
    );
  }

  if (runError || !run) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
        <h2 className="text-base font-bold">Error Loading Allocation Run</h2>
        <p className="text-xs mt-1">{runError || "Run not found"}</p>
        <Link
          href="/admin/allocations"
          className="mt-4 inline-flex items-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
        >
          &larr; Back to Allocations
        </Link>
      </div>
    );
  }

  const stats = run.stats || {};
  const counts = stats.counts || {};
  const satisfaction = stats.satisfaction || {};
  const metrics = stats.metrics || {};
  const baseline = stats.baseline || {};
  const improvement = stats.improvement || {};
  const hostelUsage = stats.hostelUsage || [];
  const waitlistReasonCounts = stats.waitlistReasonCounts || {};
  const isDraft = run.status === "draft";
  const isPublished = run.status === "published";
  const isRolledBack = run.status === "rolled_back";
  const isPublishingState = run.status === "publishing";

  return (
    <div className="space-y-6">
      {/* 1. STATUS LIFECYCLE BANNERS */}
      {isPublished && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg shadow-sm">
              ✓
            </span>
            <div>
              <p className="text-sm font-bold">Official Published Allocation</p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Published on{" "}
                <strong>
                  {run.publishedAt
                    ? new Date(run.publishedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Recently"}
                </strong>
                . Physical room occupancies are live and assigned groups are locked.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/admin/allocations/${runId}/export`}
              className="inline-flex items-center rounded-xl bg-white border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-sm"
              download
            >
              <span className="mr-1.5">📥</span> Download CSV
            </a>
            <Button
              onClick={() => {
                setRollbackError(null);
                setRollbackConfirmText("");
                setRollbackModalOpen(true);
              }}
              variant="outline"
              size="sm"
              className="border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              Rollback Run
            </Button>
          </div>
        </div>
      )}

      {isRolledBack && (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-100 border border-slate-200 p-4 text-slate-800 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-500 text-white font-bold text-lg">
            ↩
          </span>
          <div className="text-xs sm:text-sm">
            <p className="font-bold">Allocation Rolled Back</p>
            <p className="text-slate-600 mt-0.5">
              This run was rolled back on{" "}
              {run.rolledBackAt ? new Date(run.rolledBackAt).toLocaleString() : "N/A"}. Room occupancies and original group states were restored.
            </p>
          </div>
        </div>
      )}

      {isPublishingState && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent shrink-0" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold">Publishing in Progress...</p>
            <p className="text-amber-800 mt-0.5">
              Database transactions are committing room occupancies, group locks, and final allocation records.
            </p>
          </div>
        </div>
      )}

      {isDraft && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-indigo-50 border border-indigo-200 p-4 text-indigo-900 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg">
              ✏️
            </span>
            <div>
              <p className="text-sm font-bold">Draft Allocation & Edit Mode</p>
              <p className="text-xs text-indigo-700 mt-0.5">
                Review, move units, swap rooms, swap roommates with deal-breaker overrides, and publish when satisfied.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {run.editLog?.length > 0 && (
              <button
                type="button"
                onClick={() => setShowEditLog(!showEditLog)}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
              >
                {showEditLog ? "Hide History" : `Edit History (${run.editLog.length})`}
              </button>
            )}
            <Button
              onClick={handleOpenPublishModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
            >
              <span className="mr-1.5">🚀</span> Publish Allocations
            </Button>
          </div>
        </div>
      )}

      {/* Edit History Panel (Collapsible) */}
      {showEditLog && run.editLog?.length > 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Manual Edit Audit Log ({run.editLog.length} actions)
            </h3>
            {run.overrideCount > 0 && (
              <Badge variant="rose" size="sm">
                {run.overrideCount} Deal-Breaker Overrides
              </Badge>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 text-xs">
            {run.editLog.slice().reverse().map((entry, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="blue" size="sm">
                    {entry.action.replace("_", " ").toUpperCase()}
                  </Badge>
                  <span className="text-slate-800 font-medium">{entry.summary}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{run.name}</h1>
            <Badge
              variant={
                run.status === "published"
                  ? "emerald"
                  : run.status === "draft"
                  ? "blue"
                  : run.status === "rolled_back"
                  ? "default"
                  : "amber"
              }
            >
              {run.status.replace("_", " ").toUpperCase()}
            </Badge>
            {run.edited && (
              <Badge variant="amber" size="sm">
                MANUALLY EDITED
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1 font-mono">
            <span>
              Priority:{" "}
              <strong className="font-sans font-semibold capitalize text-slate-700">
                {run.options?.priorityMode}
              </strong>
            </span>
            <span>•</span>
            <span>
              Seed: <strong className="font-mono text-slate-700">{String(run.options?.seed)}</strong>
            </span>
            <span>•</span>
            <span>
              Created: {new Date(run.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
        </div>

        <Link
          href="/admin/allocations"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          &larr; Back to History
        </Link>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Allocated</span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">
            {counts.studentsAllocated ?? 0}
          </span>
          <span className="text-[11px] text-slate-500">students placed</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Rooms Used</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {counts.roomsUsed ?? 0}
          </span>
          <span className="text-[11px] text-slate-500">rooms filled</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Beds Filled</span>
          <span className="text-xl font-bold text-indigo-600 mt-1 block">
            {counts.bedsFilled ?? 0}
          </span>
          <span className="text-[11px] text-slate-500">total beds</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Waitlisted</span>
          <span className="text-xl font-bold text-amber-600 mt-1 block">
            {counts.unitsWaitlisted ?? 0}
          </span>
          <span className="text-[11px] text-slate-500">groups ({counts.studentsWaitlisted ?? 0} students)</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Unallocated</span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">
            {counts.studentsUnallocated ?? 0}
          </span>
          <span className="text-[11px] text-slate-500">solo students</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Overrides</span>
          <span className="text-xl font-bold text-purple-600 mt-1 block font-mono">
            {run.overrideCount ?? 0}
          </span>
          <span className="text-[11px] text-slate-500">deal-breakers</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Runtime</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
            {stats.durationMs ?? 0}ms
          </span>
          <span className="text-[11px] text-slate-500">execution</span>
        </div>
      </div>

      {/* 2. Room Placements & Assignments Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-200/80 bg-slate-50/60 p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Room Placements & Assignments</h2>
            <p className="text-xs text-slate-500">
              Showing {assignments.length} of {assignmentsPagination.total} assignment records
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned Only</option>
              <option value="waitlisted">Waitlisted Only</option>
            </select>

            <select
              value={hostelFilter}
              onChange={(e) => setHostelFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Hostels</option>
              {hostelUsage.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} - {h.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search student or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {loadingAssignments ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-3 text-sm text-slate-500">Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No assignment records match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-3.5">#</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Members</th>
                  <th className="px-6 py-3.5">Room & Hostel</th>
                  <th className="px-6 py-3.5">Compatibility</th>
                  <th className="px-6 py-3.5">Hostel Rank</th>
                  <th className="px-6 py-3.5">AC / Floor</th>
                  {isDraft && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((item) => {
                  const members = item.members || [];
                  const room = item.room;
                  const hostel = item.hostel;

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5 text-xs font-mono text-slate-400">
                        {item.order}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant={item.status === "assigned" ? "emerald" : "amber"}
                            size="sm"
                          >
                            {item.status.toUpperCase()}
                          </Badge>
                          {item.edited && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Edited
                            </span>
                          )}
                          {item.overridden && (
                            <span
                              title={`Override: ${item.overrideReason || "Admin approval"}`}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 cursor-help"
                            >
                              Overridden
                            </span>
                          )}
                        </div>
                        {item.waitlistReason && (
                          <span className="block text-[10px] text-amber-700 mt-1">
                            {WAITLIST_REASONS[item.waitlistReason]?.label || item.waitlistReason}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="space-y-1">
                          {members.map((m) => (
                            <div key={m._id} className="text-xs">
                              <span className="font-bold text-slate-900">{m.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono ml-1.5">
                                ({m.registrationNumber || "No Reg"}) - Yr {m.year}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {room && hostel ? (
                          <div>
                            <span className="font-bold text-slate-900">
                              {hostel.code} - Room {room.roomNumber}
                            </span>
                            <span className="text-xs text-slate-500 block">
                              Floor {room.floor} • {room.roomType} • {room.capacity} Beds
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No room assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {item.groupAverage !== null ? (
                          <div>
                            <span className="font-bold text-indigo-700">
                              {item.groupAverage}% avg
                            </span>
                            {item.groupLowest !== null && (
                              <span className="text-[11px] text-slate-400 block">
                                Lowest: {item.groupLowest}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {item.hostelRank === 1 ? (
                          <Badge variant="emerald" size="sm">1st Choice</Badge>
                        ) : item.hostelRank === 2 ? (
                          <Badge variant="blue" size="sm">2nd Choice</Badge>
                        ) : item.hostelRank === 3 ? (
                          <Badge variant="purple" size="sm">3rd Choice</Badge>
                        ) : item.hostelRank === 0 ? (
                          <Badge variant="default" size="sm">Fallback</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.acMatch === true
                                ? "bg-cyan-100 text-cyan-800"
                                : item.acMatch === false
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            AC: {item.acMatch === true ? "✓" : item.acMatch === false ? "✗" : "—"}
                          </span>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.floorMatch === true
                                ? "bg-indigo-100 text-indigo-800"
                                : item.floorMatch === false
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            Floor: {item.floorMatch === true ? "✓" : item.floorMatch === false ? "✗" : "—"}
                          </span>
                        </div>
                      </td>
                      {isDraft && (
                        <td className="px-6 py-3.5 text-right space-x-1">
                          {item.status === "assigned" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item, "move")}
                                className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                              >
                                Move
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item, "swap_rooms")}
                                className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                              >
                                Swap Room
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item, "swap_members")}
                                className="px-2 py-1 text-xs font-semibold rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                Swap Member
                              </button>
                              <button
                                type="button"
                                onClick={() => setUnassignUnitId(item._id)}
                                className="px-2 py-1 text-xs font-semibold rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                              >
                                Unassign
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item, "assign_waitlisted")}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              Assign Room
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {assignmentsPagination.pages > 1 && (
          <div className="p-4 border-t border-slate-200/80">
            <Pagination
              currentPage={assignmentsPagination.page}
              totalPages={assignmentsPagination.pages}
              onPageChange={(p) => fetchAssignments(p)}
            />
          </div>
        )}
      </div>

      {/* 3. PUBLISH REVIEW MODAL */}
      <Modal
        isOpen={publishModalOpen}
        onClose={() => !isPublishing && setPublishModalOpen(false)}
        title="Review & Publish Allocation"
        description="Verify database pre-flight checks before official publication."
        maxWidth="max-w-2xl"
      >
        {loadingPreview ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="mt-3 text-xs text-slate-500">Checking room occupancies and group integrity...</p>
          </div>
        ) : publishError && !publishPreview ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 font-medium">
              {publishError}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setPublishModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : publishPreview ? (
          <form onSubmit={handleExecutePublish} className="space-y-4">
            {publishError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {publishError}
              </div>
            )}

            {publishPreview.conflicts?.length > 0 ? (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 space-y-2">
                <p className="text-xs font-bold text-rose-900">
                  Publication Blocked: {publishPreview.conflicts.length} conflict(s) detected:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-rose-800">
                  {publishPreview.conflicts.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span>•</span>
                      <span>{c.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Students</span>
                    <span className="text-lg font-bold text-slate-900">
                      {publishPreview.summary?.students}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Rooms</span>
                    <span className="text-lg font-bold text-slate-900">
                      {publishPreview.summary?.rooms}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Groups Locked</span>
                    <span className="text-lg font-bold text-slate-900">
                      {publishPreview.summary?.groupsLocked}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Overrides</span>
                    <span className="text-lg font-bold text-purple-700">
                      {publishPreview.summary?.overrides}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  ⚠️ <strong>Notice:</strong> Publishing updates live room occupancy and locks roommate groups. You can roll this run back later if necessary.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Type &quot;PUBLISH&quot; to confirm:
                  </label>
                  <input
                    type="text"
                    value={publishConfirmText}
                    onChange={(e) => setPublishConfirmText(e.target.value)}
                    placeholder="PUBLISH"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                    disabled={isPublishing}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPublishModalOpen(false)}
                disabled={isPublishing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPublishing || !publishPreview.canPublish || publishConfirmText !== "PUBLISH"}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isPublishing ? "Publishing Live..." : "Confirm & Publish"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* 4. ROLLBACK MODAL */}
      <Modal
        isOpen={rollbackModalOpen}
        onClose={() => !isRollingBack && setRollbackModalOpen(false)}
        title="Rollback Published Allocation"
        description="Reverses room occupancy increments and returns roommate groups to prior state."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExecuteRollback} className="space-y-4">
          {rollbackError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
              {rollbackError}
            </div>
          )}

          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-900 space-y-1">
            <p className="font-bold">⚠️ Warning:</p>
            <p>
              Rolling back will cancel all active student room allocations from this run, decrement room occupancies, and restore original roommate groups.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Type &quot;ROLLBACK&quot; to confirm:
            </label>
            <input
              type="text"
              value={rollbackConfirmText}
              onChange={(e) => setRollbackConfirmText(e.target.value)}
              placeholder="ROLLBACK"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-rose-500 focus:outline-none"
              disabled={isRollingBack}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRollbackModalOpen(false)}
              disabled={isRollingBack}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isRollingBack || rollbackConfirmText !== "ROLLBACK"}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isRollingBack ? "Rolling Back..." : "Execute Rollback"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. MOVE & ASSIGN WAITLISTED MODAL */}
      <Modal
        isOpen={activeEditModal === "move" || activeEditModal === "assign_waitlisted"}
        onClose={() => !editActionLoading && setActiveEditModal(null)}
        title={activeEditModal === "assign_waitlisted" ? "Assign Waitlisted Unit" : "Move Unit to Another Room"}
        description={`Available free rooms matching unit capacity (${selectedUnit?.size} beds).`}
        maxWidth="max-w-xl"
      >
        {loadingEditOptions ? (
          <div className="py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500">Checking available rooms...</p>
          </div>
        ) : editOptions ? (
          <div className="space-y-4">
            {editModalError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {editModalError}
              </div>
            )}

            {editOptions.hostels?.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No free rooms of capacity {selectedUnit?.size} satisfy hard constraints for this unit.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
                {editOptions.hostels?.map((h) => (
                  <div key={h.hostelId} className="border border-slate-200 rounded-xl p-3 bg-white">
                    <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2">
                      {h.hostelName} ({h.hostelCode})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {h.rooms.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs hover:border-indigo-400 transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900">Room {r.roomNumber}</span>
                            <span className="text-[11px] text-slate-500 block">
                              Floor {r.floor} • {r.roomType}
                            </span>
                            {r.acMismatch && (
                              <span className="text-[10px] text-amber-700 font-semibold block">
                                ⚠ AC Mismatch
                              </span>
                            )}
                            {r.floorMismatch && (
                              <span className="text-[10px] text-amber-700 font-semibold block">
                                ⚠ Floor Mismatch
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            disabled={editActionLoading}
                            onClick={() => handleExecuteMoveOrAssign(r.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px]"
                          >
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* 6. SWAP ROOMS MODAL */}
      <Modal
        isOpen={activeEditModal === "swap_rooms"}
        onClose={() => !editActionLoading && setActiveEditModal(null)}
        title="Swap Rooms with Another Unit"
        description={`Select an assigned unit of equal size (${selectedUnit?.size} beds) to swap rooms.`}
        maxWidth="max-w-xl"
      >
        {loadingEditOptions ? (
          <div className="py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500">Loading partner units...</p>
          </div>
        ) : editOptions ? (
          <div className="space-y-4">
            {editModalError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {editModalError}
              </div>
            )}

            {editOptions.partners?.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No eligible swap partner units of capacity {selectedUnit?.size} found.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {editOptions.partners?.map((p) => (
                  <div
                    key={p.unitId}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 transition-colors text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {p.hostelName} - Room {p.roomNumber} ({p.roomType})
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {p.members?.map((m) => m.name).join(", ")}
                      </div>
                      <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                        {p.groupAverage}% group average
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={editActionLoading}
                      onClick={() => handleExecuteSwapRooms(p.unitId)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px]"
                    >
                      Swap Room
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* 7. SWAP MEMBERS MODAL */}
      <Modal
        isOpen={activeEditModal === "swap_members"}
        onClose={() => !editActionLoading && setActiveEditModal(null)}
        title="Swap Roommate Between Units"
        description="Select a student from this unit and a student from another unit of the same gender."
        maxWidth="max-w-xl"
      >
        {loadingEditOptions ? (
          <div className="py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500">Loading units...</p>
          </div>
        ) : editOptions ? (
          <form onSubmit={handleExecuteSwapMembers} className="space-y-4">
            {editModalError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {editModalError}
              </div>
            )}

            {/* Student A selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Student to move out of Unit A:
              </label>
              <select
                value={swapMemberA}
                onChange={(e) => setSwapMemberA(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                {editOptions.members?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Year {m.year})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Unit B selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Unit B:
              </label>
              <select
                value={swapUnitB}
                onChange={(e) => {
                  setSwapUnitB(e.target.value);
                  const partner = editOptions.otherUnits?.find((u) => u.unitId === e.target.value);
                  setSwapMemberB(partner?.members?.[0]?.id || "");
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="">-- Select Partner Unit --</option>
                {editOptions.otherUnits?.map((u) => (
                  <option key={u.unitId} value={u.unitId}>
                    Room {u.roomNumber} ({u.members?.map((m) => m.name).join(", ")})
                  </option>
                ))}
              </select>
            </div>

            {/* Student B selection */}
            {swapUnitB && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Student to bring in from Unit B:
                </label>
                <select
                  value={swapMemberB}
                  onChange={(e) => setSwapMemberB(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                >
                  {editOptions.otherUnits
                    ?.find((u) => u.unitId === swapUnitB)
                    ?.members?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Year {m.year})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Override Controls if deal-breaker triggered */}
            {swapOverrideRequired && (
              <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 space-y-2">
                <p className="text-xs font-bold text-purple-900">
                  Deal-Breaker Conflict Detected
                </p>
                <div className="space-y-1 text-[11px] text-purple-800">
                  {swapConflictingPairs.map((p, i) => (
                    <div key={i}>
                      • Mutual conflict between {p.member1?.name} and {p.member2?.name}
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmOverrideChecked}
                    onChange={(e) => setConfirmOverrideChecked(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-bold text-purple-950">
                    Approve administrator override for this deal-breaker conflict
                  </span>
                </label>

                {confirmOverrideChecked && (
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                      Reason for override (min 5 characters):
                    </label>
                    <textarea
                      rows={2}
                      value={overrideReasonText}
                      onChange={(e) => setOverrideReasonText(e.target.value)}
                      placeholder="e.g. Special administrative accommodation requested by students..."
                      className="w-full rounded-lg border border-purple-300 px-2.5 py-1.5 text-xs text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveEditModal(null)}
                disabled={editActionLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  editActionLoading ||
                  !swapMemberA ||
                  !swapUnitB ||
                  !swapMemberB ||
                  (swapOverrideRequired && (!confirmOverrideChecked || overrideReasonText.trim().length < 5))
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {editActionLoading ? "Swapping..." : "Execute Swap"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* 8. UNASSIGN CONFIRMATION */}
      <ConfirmDialog
        isOpen={Boolean(unassignUnitId)}
        title="Unassign Unit & Free Room"
        message="Are you sure you want to move this unit to the waitlist and release their assigned room?"
        confirmLabel={isUnassigning ? "Unassigning..." : "Unassign to Waitlist"}
        isDestructive={true}
        onConfirm={handleExecuteUnassign}
        onCancel={() => setUnassignUnitId(null)}
      />
    </div>
  );
}
