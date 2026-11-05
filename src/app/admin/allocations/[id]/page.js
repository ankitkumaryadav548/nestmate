"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import {
  PageContainer,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Badge,
  StatCard,
  AnimatedNumber,
  ProgressBar,
  Modal,
  ConfirmDialog,
  Select,
  Input,
  Textarea,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableSkeleton,
  Pagination,
  EmptyState,
  ErrorState,
  Alert,
} from "@/components/ui";
import {
  AdminPageHeader,
  DataTable,
  StatusBadge,
  ConfirmTypeDialog,
  HorizontalBars,
  StackedBar,
} from "@/components/admin";
import { WAITLIST_REASONS } from "@/config/allocation";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function AdminAllocationResultPage({ params }) {
  const unwrappedParams = use(params);
  const runId = unwrappedParams.id;

  const [run, setRun] = useState(null);
  useDocumentTitle(run ? (run.name || "Allocation Run") : "Allocation Run", true);
  const [loadingRun, setLoadingRun] = useState(true);
  const [runError, setRunError] = useState(null);

  // Assignments filter & pagination state
  const [assignments, setAssignments] = useState([]);
  const [assignmentsPagination, setAssignmentsPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [hostelFilter, setHostelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Publication & Rollback Modal State
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishPreview, setPublishPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);

  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
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

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  useEffect(() => {
    fetchAssignments(1);
  }, [fetchAssignments]);

  // Handle Publish Preview Load
  const handleOpenPublishModal = async () => {
    setPublishModalOpen(true);
    setPublishPreview(null);
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
  const handleExecutePublish = async () => {
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
  const handleExecuteRollback = async () => {
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
      <PageContainer maxWidth="7xl">
        <div className="py-24 text-center">
          <div className="inline-block h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Loading allocation run results...</p>
        </div>
      </PageContainer>
    );
  }

  if (runError || !run) {
    return (
      <PageContainer maxWidth="7xl">
        <ErrorState
          title="Error Loading Allocation Run"
          message={runError || "Run not found"}
          action={
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={fetchRun}>
                Try again
              </Button>
              <Link href="/admin/allocations">
                <Button variant="outline" size="sm">
                  &larr; Back to Allocations
                </Button>
              </Link>
            </div>
          }
        />
      </PageContainer>
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
    <PageContainer maxWidth="7xl">
      <div className="space-y-6">
        {/* 1. STATUS LIFECYCLE BANNERS */}
        {isPublished && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 p-4 text-teal-900 dark:text-teal-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-lg shadow-sm">
                
              </span>
              <div>
                <p className="text-sm font-bold">Official Published Allocation</p>
                <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
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
                className="inline-flex items-center rounded-xl bg-[var(--card)] border border-teal-300 dark:border-teal-700 px-3 py-2 text-xs font-bold text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors shadow-sm"
                download
              >
                <span className="mr-1.5">ðŸ“¥</span> Download CSV
              </a>
              <Button
                onClick={() => {
                  setRollbackError(null);
                  setRollbackModalOpen(true);
                }}
                variant="outline"
                size="sm"
                className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
              >
                Rollback Run
              </Button>
            </div>
          </div>
        )}

        {isRolledBack && (
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--muted)]/50 border border-[var(--border)] p-4 text-[var(--foreground)] shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-500 text-white font-bold text-lg">
              â†©
            </span>
            <div className="text-xs sm:text-sm">
              <p className="font-bold">Allocation Rolled Back</p>
              <p className="text-[var(--muted-foreground)] mt-0.5">
                This run was rolled back on{" "}
                {run.rolledBackAt ? new Date(run.rolledBackAt).toLocaleString() : "N/A"}. Room occupancies and original group states were restored.
              </p>
            </div>
          </div>
        )}

        {isPublishingState && (
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-amber-900 dark:text-amber-200 shadow-sm">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="font-bold">Publishing in Progress...</p>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                Database transactions are committing room occupancies, group locks, and final allocation records.
              </p>
            </div>
          </div>
        )}

        {isDraft && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-amber-900 dark:text-amber-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white font-bold text-lg">
                
              </span>
              <div>
                <p className="text-sm font-bold">Draft Allocation & Edit Mode</p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Review, move units, swap rooms, swap roommates with deal-breaker overrides, and publish when satisfied.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {run.editLog?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowEditLog(!showEditLog)}
                  className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline"
                >
                  {showEditLog ? "Hide History" : `Edit History (${run.editLog.length})`}
                </button>
              )}
              <Button
                onClick={handleOpenPublishModal}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20"
              >
                <span className="mr-1.5">ðŸš€</span> Publish Allocations
              </Button>
            </div>
          </div>
        )}

        {/* Edit History Panel (Collapsible) */}
        {showEditLog && run.editLog?.length > 0 && (
          <Card className="p-5 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                Manual Edit Audit Log ({run.editLog.length} actions)
              </h3>
              {run.overrideCount > 0 && (
                <Badge variant="rose" size="sm">
                  {run.overrideCount} Deal-Breaker Overrides
                </Badge>
              )}
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-[var(--border)] text-xs">
              {run.editLog.slice().reverse().map((entry, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="blue" size="sm">
                      {entry.action.replace("_", " ").toUpperCase()}
                    </Badge>
                    <span className="text-[var(--foreground)] font-medium">{entry.summary}</span>
                  </div>
                  <span className="text-[11px] text-[var(--muted-foreground)] font-mono shrink-0">
                    {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Header with Breadcrumbs */}
        <AdminPageHeader
          title={run.name}
          description={`Priority: ${run.options?.priorityMode || "groups_first"} • Seed: ${run.options?.seed ?? 42} • Created: ${new Date(run.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`}
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Allocations", href: "/admin/allocations" },
            { label: run.name },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge type="run" status={run.status} />
              {run.edited && (
                <Badge variant="amber" size="sm">
                  Edited
                </Badge>
              )}
              <Link href="/admin/allocations">
                <Button variant="outline" size="sm">
                  &larr; Back
                </Button>
              </Link>
            </div>
          }
        />

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard
            title="Allocated"
            value={<AnimatedNumber value={counts.studentsAllocated ?? 0} />}
            subtitle="students placed"
            variant="teal"
          />
          <StatCard
            title="Rooms Used"
            value={<AnimatedNumber value={counts.roomsUsed ?? 0} />}
            subtitle="rooms filled"
            variant="default"
          />
          <StatCard
            title="Beds Filled"
            value={<AnimatedNumber value={counts.bedsFilled ?? 0} />}
            subtitle="total beds"
            variant="brand"
          />
          <StatCard
            title="Waitlisted"
            value={<AnimatedNumber value={counts.unitsWaitlisted ?? 0} />}
            subtitle={`${counts.studentsWaitlisted ?? 0} students`}
            variant="amber"
          />
          <StatCard
            title="Unallocated"
            value={<AnimatedNumber value={counts.studentsUnallocated ?? 0} />}
            subtitle="solo students"
            variant="rose"
          />
          <StatCard
            title="Overrides"
            value={<AnimatedNumber value={run.overrideCount ?? 0} />}
            subtitle="deal-breakers"
            variant="purple"
          />
          <StatCard
            title="Runtime"
            value={`${stats.durationMs ?? 0}ms`}
            subtitle="execution"
            variant="default"
          />
        </div>

        {/* Comparative Analysis & Preference Satisfaction Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Algorithm Comparison vs Monte Carlo Random */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  Algorithm vs Random Baseline
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Monte Carlo baseline ({baseline.trials ?? 20} trials)
                </p>
              </div>
              {improvement.deltaAvgPairScore > 0 && (
                <Badge variant="teal" size="sm">
                  +{improvement.deltaAvgPairScore}% Pair Score
                </Badge>
              )}
            </div>

            <HorizontalBars
              data={[
                {
                  label: "HostelMatch Allocation",
                  value: Math.round(metrics.avgPairScore ?? 0),
                  max: 100,
                  suffix: "% avg pair score",
                  color: "var(--teal-500)",
                },
                {
                  label: "Random Baseline",
                  value: Math.round(baseline.avg?.avgPairScore ?? 0),
                  max: 100,
                  suffix: "% avg pair score",
                  color: "var(--slate-400)",
                },
              ]}
            />

            <div className="rounded-xl bg-[var(--muted)]/50 p-3 text-xs text-[var(--muted-foreground)] border border-[var(--border)] flex items-center justify-between">
              <span>Same students, same rooms; only roommate pairing differs.</span>
              <span className="font-semibold text-teal-600 dark:text-teal-400">
                Conflicts: {metrics.roomsWithConflict ?? 0} vs {Math.round(baseline.avg?.roomsWithConflict ?? 0)}
              </span>
            </div>
          </Card>

          {/* Preference Satisfaction */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  Hostel Preference Satisfaction
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {satisfaction.withHostelPrefs ?? 0} units with preferences
                </p>
              </div>
              <Badge variant="brand" size="sm">
                {satisfaction.rank1?.percent ?? 0}% 1st Choice
              </Badge>
            </div>

            <StackedBar
              segments={[
                {
                  label: `1st Choice (${satisfaction.rank1?.count ?? 0})`,
                  value: satisfaction.rank1?.count ?? 0,
                  color: "var(--teal-500)",
                },
                {
                  label: `2nd Choice (${satisfaction.rank2?.count ?? 0})`,
                  value: satisfaction.rank2?.count ?? 0,
                  color: "var(--brand-500)",
                },
                {
                  label: `3rd Choice (${satisfaction.rank3?.count ?? 0})`,
                  value: satisfaction.rank3?.count ?? 0,
                  color: "var(--purple-500)",
                },
                {
                  label: `Other (${satisfaction.other?.count ?? 0})`,
                  value: satisfaction.other?.count ?? 0,
                  color: "var(--slate-400)",
                },
              ]}
              total={satisfaction.withHostelPrefs || 1}
            />

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl border border-[var(--border)] p-2.5 text-xs">
                <span className="text-[var(--muted-foreground)] block text-[11px]">AC Satisfaction</span>
                <span className="font-bold text-[var(--foreground)] text-sm">
                  {satisfaction.acSatisfied?.percent ?? 0}%
                </span>{" "}
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  ({satisfaction.acSatisfied?.count ?? 0}/{satisfaction.acRequested ?? 0})
                </span>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-2.5 text-xs">
                <span className="text-[var(--muted-foreground)] block text-[11px]">Floor Satisfaction</span>
                <span className="font-bold text-[var(--foreground)] text-sm">
                  {satisfaction.floorSatisfied?.percent ?? 0}%
                </span>{" "}
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  ({satisfaction.floorSatisfied?.count ?? 0}/{satisfaction.floorRequested ?? 0})
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Hostel Utilization & Waitlist Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Hostel Bed Utilization</h3>
            {hostelUsage.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] py-4">No hostel utilization data.</p>
            ) : (
              <HorizontalBars
                data={hostelUsage.map((h) => ({
                  label: `${h.code} (${h.name})`,
                  value: h.bedsAllocated,
                  max: h.bedCapacity || (h.bedsAllocated || 1),
                  suffix: ` / ${h.bedCapacity} beds (${Math.round((h.bedsAllocated / (h.bedCapacity || 1)) * 100)}%)`,
                }))}
              />
            )}
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Waitlist Reasons</h3>
            {Object.keys(waitlistReasonCounts).length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] py-4">No waitlisted groups.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(waitlistReasonCounts).map(([reason, cnt]) => {
                  const meta = WAITLIST_REASONS[reason] || { label: reason, description: "" };
                  return (
                    <div
                      key={reason}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[var(--foreground)] block">{meta.label}</span>
                        {meta.description && (
                          <span className="text-[11px] text-[var(--muted-foreground)]">{meta.description}</span>
                        )}
                      </div>
                      <Badge variant="amber" size="sm">
                        {cnt}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* 2. Room Placements & Assignments Table */}
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--muted)]/40 p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--foreground)]">Room Placements & Assignments</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Showing {assignments.length} of {assignmentsPagination.total} assignment records
              </p>
            </div>

            {/* Table Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-auto text-xs py-1.5"
              >
                <option value="all">All Statuses</option>
                <option value="assigned">Assigned Only</option>
                <option value="waitlisted">Waitlisted Only</option>
              </Select>

              <Select
                value={hostelFilter}
                onChange={(e) => setHostelFilter(e.target.value)}
                className="w-auto text-xs py-1.5"
              >
                <option value="all">All Hostels</option>
                {hostelUsage.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.code} - {h.name}
                  </option>
                ))}
              </Select>

              <Input
                type="text"
                placeholder="Search student or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 text-xs py-1.5"
              />
            </div>
          </div>

          {loadingAssignments ? (
            <TableSkeleton rows={8} columns={isDraft ? 8 : 7} />
          ) : assignments.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              No assignment records match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Room & Hostel</TableHead>
                    <TableHead>Compatibility</TableHead>
                    <TableHead>Hostel Rank</TableHead>
                    <TableHead>AC / Floor</TableHead>
                    {isDraft && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((item) => {
                    const members = item.members || [];
                    const room = item.room;
                    const hostel = item.hostel;

                    return (
                      <TableRow key={item._id}>
                        <TableCell className="text-xs font-mono text-[var(--muted-foreground)]">
                          {item.order}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant={item.status === "assigned" ? "teal" : "amber"}
                              size="sm"
                            >
                              {item.status.toUpperCase()}
                            </Badge>
                            {item.edited && (
                              <Badge variant="amber" size="sm">
                                Edited
                              </Badge>
                            )}
                            {item.overridden && (
                              <Badge
                                variant="purple"
                                size="sm"
                                title={`Override: ${item.overrideReason || "Admin approval"}`}
                              >
                                Overridden
                              </Badge>
                            )}
                          </div>
                          {item.waitlistReason && (
                            <span className="block text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                              {WAITLIST_REASONS[item.waitlistReason]?.label || item.waitlistReason}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {members.map((m) => (
                              <div key={m._id} className="text-xs">
                                <span className="font-bold text-[var(--foreground)]">{m.name}</span>
                                <span className="text-[11px] text-[var(--muted-foreground)] font-mono ml-1.5">
                                  ({m.registrationNumber || "No Reg"}) - Yr {m.year}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {room && hostel ? (
                            <div>
                              <span className="font-bold text-[var(--foreground)]">
                                {hostel.code} - Room {room.roomNumber}
                              </span>
                              <span className="text-xs text-[var(--muted-foreground)] block">
                                Floor {room.floor} • {room.roomType} • {room.capacity} Beds
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)] italic">No room assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.groupAverage !== null ? (
                            <div>
                              <span className="font-bold text-teal-600 dark:text-teal-400">
                                {item.groupAverage}% avg
                              </span>
                              {item.groupLowest !== null && (
                                <span className="text-[11px] text-[var(--muted-foreground)] block">
                                  Lowest: {item.groupLowest}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.hostelRank === 1 ? (
                            <Badge variant="teal" size="sm">1st Choice</Badge>
                          ) : item.hostelRank === 2 ? (
                            <Badge variant="blue" size="sm">2nd Choice</Badge>
                          ) : item.hostelRank === 3 ? (
                            <Badge variant="purple" size="sm">3rd Choice</Badge>
                          ) : item.hostelRank === 0 ? (
                            <Badge variant="default" size="sm">Fallback</Badge>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                item.acMatch === true
                                  ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                                  : item.acMatch === false
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                              }`}
                            >
                              AC: {item.acMatch === true ? "" : item.acMatch === false ? "" : "-"}
                            </span>
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                item.floorMatch === true
                                  ? "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300"
                                  : item.floorMatch === false
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                              }`}
                            >
                              Floor: {item.floorMatch === true ? "" : item.floorMatch === false ? "" : "-"}
                            </span>
                          </div>
                        </TableCell>
                        {isDraft && (
                          <TableCell className="text-right space-x-1">
                            {item.status === "assigned" ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditModal(item, "move")}
                                  className="text-xs py-1 px-2 h-auto"
                                >
                                  Move
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditModal(item, "swap_rooms")}
                                  className="text-xs py-1 px-2 h-auto"
                                >
                                  Swap Room
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditModal(item, "swap_members")}
                                  className="text-xs py-1 px-2 h-auto text-brand-600 dark:text-brand-400"
                                >
                                  Swap Member
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setUnassignUnitId(item._id)}
                                  className="text-xs py-1 px-2 h-auto text-rose-600 hover:text-rose-700"
                                >
                                  Unassign
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleOpenEditModal(item, "assign_waitlisted")}
                                className="text-xs py-1 px-2.5 h-auto bg-brand-600 hover:bg-brand-700 text-white"
                              >
                                Assign Room
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {assignmentsPagination.pages > 1 && (
            <div className="p-4 border-t border-[var(--border)]">
              <Pagination
                currentPage={assignmentsPagination.page}
                totalPages={assignmentsPagination.pages}
                onPageChange={(p) => fetchAssignments(p)}
              />
            </div>
          )}
        </Card>

        {/* 3. PUBLISH REVIEW MODAL (ConfirmTypeDialog with requiredWord="PUBLISH") */}
        <ConfirmTypeDialog
          isOpen={publishModalOpen}
          onClose={() => !isPublishing && setPublishModalOpen(false)}
          onConfirm={handleExecutePublish}
          title="Review & Publish Allocation"
          description="Verify database pre-flight checks before official publication."
          requiredWord="PUBLISH"
          confirmLabel={isPublishing ? "Publishing Live..." : "Confirm & Publish"}
          loading={isPublishing}
          error={publishError}
          isDestructive={false}
        >
          {loadingPreview ? (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">Checking room occupancies and group integrity...</p>
            </div>
          ) : publishPreview ? (
            <div className="space-y-4">
              {publishPreview.conflicts?.length > 0 ? (
                <Alert variant="danger">
                  <p className="text-xs font-bold mb-1">
                    Publication Blocked: {publishPreview.conflicts.length} conflict(s) detected:
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                    {publishPreview.conflicts.map((c, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span>•</span>
                        <span>{c.message}</span>
                      </div>
                    ))}
                  </div>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-2.5 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
                      <span className="text-[11px] font-bold text-[var(--muted-foreground)] block uppercase">Students</span>
                      <span className="text-base font-bold text-[var(--foreground)]">
                        {publishPreview.summary?.students}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
                      <span className="text-[11px] font-bold text-[var(--muted-foreground)] block uppercase">Rooms</span>
                      <span className="text-base font-bold text-[var(--foreground)]">
                        {publishPreview.summary?.rooms}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
                      <span className="text-[11px] font-bold text-[var(--muted-foreground)] block uppercase">Groups Locked</span>
                      <span className="text-base font-bold text-[var(--foreground)]">
                        {publishPreview.summary?.groupsLocked}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
                      <span className="text-[11px] font-bold text-[var(--muted-foreground)] block uppercase">Overrides</span>
                      <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                        {publishPreview.summary?.overrides}
                      </span>
                    </div>
                  </div>

                  <Alert variant="warning">
                    Publishing updates live room occupancy and locks roommate groups. You can roll this run back later if necessary.
                  </Alert>
                </div>
              )}
            </div>
          ) : null}
        </ConfirmTypeDialog>

        {/* 4. ROLLBACK MODAL (ConfirmTypeDialog with requiredWord="ROLLBACK") */}
        <ConfirmTypeDialog
          isOpen={rollbackModalOpen}
          onClose={() => !isRollingBack && setRollbackModalOpen(false)}
          onConfirm={handleExecuteRollback}
          title="Rollback Published Allocation"
          description="Reverses room occupancy increments and returns roommate groups to prior state."
          requiredWord="ROLLBACK"
          confirmLabel={isRollingBack ? "Rolling Back..." : "Execute Rollback"}
          loading={isRollingBack}
          error={rollbackError}
          isDestructive={true}
        >
          <Alert variant="danger">
            Rolling back will cancel all active student room allocations from this run, decrement room occupancies, and restore original roommate groups.
          </Alert>
        </ConfirmTypeDialog>

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
              <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">Checking available rooms...</p>
            </div>
          ) : editOptions ? (
            <div className="space-y-4">
              {editModalError && (
                <Alert variant="danger">{editModalError}</Alert>
              )}

              {editOptions.hostels?.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] py-6 text-center">
                  No free rooms of capacity {selectedUnit?.size} satisfy hard constraints for this unit.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
                  {editOptions.hostels?.map((h) => (
                    <div key={h.hostelId} className="border border-[var(--border)] rounded-xl p-3 bg-[var(--card)]">
                      <h4 className="text-xs font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-1.5 mb-2">
                        {h.hostelName} ({h.hostelCode})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {h.rooms.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 text-xs hover:border-brand-500 transition-colors"
                          >
                            <div>
                              <span className="font-bold text-[var(--foreground)]">Room {r.roomNumber}</span>
                              <span className="text-[11px] text-[var(--muted-foreground)] block">
                                Floor {r.floor} • {r.roomType}
                              </span>
                              {r.acMismatch && (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold block">
                                  Warning: AC Mismatch
                                </span>
                              )}
                              {r.floorMismatch && (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold block">
                                  Warning: Floor Mismatch
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              disabled={editActionLoading}
                              onClick={() => handleExecuteMoveOrAssign(r.id)}
                              className="text-[11px] py-1 px-2.5 h-auto"
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
              <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">Loading partner units...</p>
            </div>
          ) : editOptions ? (
            <div className="space-y-4">
              {editModalError && (
                <Alert variant="danger">{editModalError}</Alert>
              )}

              {editOptions.partners?.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] py-6 text-center">
                  No eligible swap partner units of capacity {selectedUnit?.size} found.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {editOptions.partners?.map((p) => (
                    <div
                      key={p.unitId}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-brand-500 transition-colors text-xs"
                    >
                      <div>
                        <div className="font-bold text-[var(--foreground)]">
                          {p.hostelName} - Room {p.roomNumber} ({p.roomType})
                        </div>
                        <div className="text-[var(--muted-foreground)] mt-0.5">
                          {p.members?.map((m) => m.name).join(", ")}
                        </div>
                        <div className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                          {p.groupAverage}% group average
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={editActionLoading}
                        onClick={() => handleExecuteSwapRooms(p.unitId)}
                        className="text-[11px] py-1 px-2.5 h-auto"
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
              <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">Loading units...</p>
            </div>
          ) : editOptions ? (
            <form onSubmit={handleExecuteSwapMembers} className="space-y-4">
              {editModalError && (
                <Alert variant="danger">{editModalError}</Alert>
              )}

              {/* Student A selection */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">
                  Student to move out of Unit A:
                </label>
                <Select
                  value={swapMemberA}
                  onChange={(e) => setSwapMemberA(e.target.value)}
                  className="w-full text-xs"
                >
                  {editOptions.members?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Year {m.year})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Target Unit B selection */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">
                  Target Unit B:
                </label>
                <Select
                  value={swapUnitB}
                  onChange={(e) => {
                    setSwapUnitB(e.target.value);
                    const partner = editOptions.otherUnits?.find((u) => u.unitId === e.target.value);
                    setSwapMemberB(partner?.members?.[0]?.id || "");
                  }}
                  className="w-full text-xs"
                >
                  <option value="">-- Select Partner Unit --</option>
                  {editOptions.otherUnits?.map((u) => (
                    <option key={u.unitId} value={u.unitId}>
                      Room {u.roomNumber} ({u.members?.map((m) => m.name).join(", ")})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Student B selection */}
              {swapUnitB && (
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">
                    Student to bring in from Unit B:
                  </label>
                  <Select
                    value={swapMemberB}
                    onChange={(e) => setSwapMemberB(e.target.value)}
                    className="w-full text-xs"
                  >
                    {editOptions.otherUnits
                      ?.find((u) => u.unitId === swapUnitB)
                      ?.members?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Year {m.year})
                        </option>
                      ))}
                  </Select>
                </div>
              )}

              {/* Override Controls if deal-breaker triggered */}
              {swapOverrideRequired && (
                <div className="rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-3 space-y-2">
                  <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Deal-Breaker Conflict Detected
                  </p>
                  <div className="space-y-1 text-[11px] text-purple-800 dark:text-purple-300">
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
                    <span className="text-xs font-bold text-purple-950 dark:text-purple-100">
                      Approve administrator override for this deal-breaker conflict
                    </span>
                  </label>

                  {confirmOverrideChecked && (
                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200 mb-1">
                        Reason for override (min 5 characters):
                      </label>
                      <Textarea
                        rows={2}
                        value={overrideReasonText}
                        onChange={(e) => setOverrideReasonText(e.target.value)}
                        placeholder="e.g. Special administrative accommodation requested by students..."
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
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
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
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
    </PageContainer>
  );
}
