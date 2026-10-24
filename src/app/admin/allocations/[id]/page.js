"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
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

  if (loadingRun) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">Loading allocation simulation results...</p>
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

  return (
    <div className="space-y-6">
      {/* Draft Simulation Notice Banner */}
      <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-900 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-bold text-lg">
            ⚠️
          </span>
          <div>
            <p className="text-xs sm:text-sm font-bold">Draft Simulation Run</p>
            <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
              Draft mode. Nothing has been published or permanently allocated. Official publishing and manual overrides are scheduled for the next update.
            </p>
          </div>
        </div>
        <Link
          href="/admin/allocations"
          className="text-xs font-bold text-amber-900 hover:text-amber-950 underline shrink-0 hidden sm:inline-block"
        >
          &larr; All Runs
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {run.name}
            </h1>
            <Badge
              variant={
                run.status === "draft"
                  ? "emerald"
                  : run.status === "published"
                  ? "indigo"
                  : "amber"
              }
            >
              {run.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1 font-mono">
            <span>Priority: <strong className="font-sans font-semibold capitalize text-slate-700">{run.options?.priorityMode}</strong></span>
            <span>•</span>
            <span>Seed: <strong className="font-mono text-slate-700">{String(run.options?.seed)}</strong></span>
            <span>•</span>
            <span>Gender: <strong className="font-sans capitalize text-slate-700">{run.options?.gender}</strong></span>
            <span>•</span>
            <span>
              {new Date(run.createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
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

      {/* 1. Summary Metric Cards */}
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
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Runtime</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
            {stats.durationMs ?? 0}ms
          </span>
          <span className="text-[11px] text-slate-500">execution</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Seed</span>
          <span className="text-xl font-bold text-slate-700 mt-1 block font-mono truncate">
            {run.options?.seed ?? "N/A"}
          </span>
          <span className="text-[11px] text-slate-500">deterministic</span>
        </div>
      </div>

      {/* 2. Side-by-Side: Random Baseline vs HostelMatch */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Scientific Proof: Random Baseline vs. HostelMatch</span>
              <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                Monte Carlo Proof
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact same students, exact same room capacities per gender; only roommate pairing differs.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Based on {baseline.trials ?? 20} random permutation trials
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Average Pair Score */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <span className="text-xs font-semibold text-slate-600 block mb-1">Average Pair Score</span>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-indigo-700">{metrics.avgPairScore ?? 0}%</span>
                <span className="text-xs text-slate-400 block">HostelMatch</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-slate-500">{baseline.avg?.avgPairScore ?? 0}%</span>
                <span className="text-xs text-slate-400 block">Random</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Algorithm Lift:</span>
              <span className="text-emerald-600 font-bold">
                +{improvement.avgPairScoreDiff ?? 0}% pts
              </span>
            </div>
          </div>

          {/* Good or Above Percentage */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <span className="text-xs font-semibold text-slate-600 block mb-1">Good/Above Pairs (&ge; 70%)</span>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-indigo-700">{metrics.goodOrAbovePercent ?? 0}%</span>
                <span className="text-xs text-slate-400 block">HostelMatch</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-slate-500">{baseline.avg?.goodOrAbovePercent ?? 0}%</span>
                <span className="text-xs text-slate-400 block">Random</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Quality Lift:</span>
              <span className="text-emerald-600 font-bold">
                +{improvement.goodOrAbovePercentDiff ?? 0}% pts
              </span>
            </div>
          </div>

          {/* Deal-Breaker Conflicts */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <span className="text-xs font-semibold text-slate-600 block mb-1">Deal-Breaker Conflicts</span>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-emerald-600">{metrics.pairsExcluded ?? 0}</span>
                <span className="text-xs text-slate-400 block">HostelMatch (Zero)</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-rose-500">{baseline.avg?.pairsExcluded ?? 0}</span>
                <span className="text-xs text-slate-400 block">Random Average</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Harm Reduction:</span>
              <span className="text-emerald-600 font-bold">
                -{improvement.pairsExcludedDiff ?? 0} conflicts
              </span>
            </div>
          </div>

          {/* Rooms with Conflict */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <span className="text-xs font-semibold text-slate-600 block mb-1">Rooms with Conflicts</span>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-emerald-600">{metrics.roomsWithConflict ?? 0}</span>
                <span className="text-xs text-slate-400 block">HostelMatch</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-rose-500">{baseline.avg?.roomsWithConflict ?? 0}</span>
                <span className="text-xs text-slate-400 block">Random Average</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Dispute Avoidance:</span>
              <span className="text-emerald-600 font-bold">
                -{improvement.roomsWithConflictDiff ?? 0} rooms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Preference Satisfaction Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hostel Choice Ranks */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Hostel Choice Satisfaction
            </h3>
            <span className="text-[11px] text-slate-500">
              {satisfaction.withHostelPrefs ?? 0} units submitted preferences
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-emerald-700">1st Choice Hostel</span>
                <span>{satisfaction.rank1?.percent ?? 0}% ({satisfaction.rank1?.count ?? 0})</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${satisfaction.rank1?.percent ?? 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-blue-700">2nd Choice Hostel</span>
                <span>{satisfaction.rank2?.percent ?? 0}% ({satisfaction.rank2?.count ?? 0})</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${satisfaction.rank2?.percent ?? 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-purple-700">3rd Choice Hostel</span>
                <span>{satisfaction.rank3?.percent ?? 0}% ({satisfaction.rank3?.count ?? 0})</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${satisfaction.rank3?.percent ?? 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-slate-600">Other (Fallback Round)</span>
                <span>{satisfaction.other?.percent ?? 0}% ({satisfaction.other?.count ?? 0})</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full"
                  style={{ width: `${satisfaction.other?.percent ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* AC Satisfaction */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              AC Climate Satisfaction
            </h3>
            <span className="text-[11px] text-slate-500">
              {satisfaction.acRequested ?? 0} units requested specific AC/Non-AC
            </span>
          </div>

          <div className="pt-2">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-cyan-600">
                {satisfaction.acSatisfied?.percent ?? 0}%
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {satisfaction.acSatisfied?.count ?? 0} of {satisfaction.acRequested ?? 0} satisfied
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${satisfaction.acSatisfied?.percent ?? 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
              Units without a specific AC preference (flexible) are excluded from this metric and placed in whichever room type is available.
            </p>
          </div>
        </div>

        {/* Floor Band Satisfaction */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Floor Band Satisfaction
            </h3>
            <span className="text-[11px] text-slate-500">
              {satisfaction.floorRequested ?? 0} units requested specific floor band
            </span>
          </div>

          <div className="pt-2">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-indigo-600">
                {satisfaction.floorSatisfied?.percent ?? 0}%
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {satisfaction.floorSatisfied?.count ?? 0} of {satisfaction.floorRequested ?? 0} satisfied
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${satisfaction.floorSatisfied?.percent ?? 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
              Evaluated dynamically relative to building total floors (low = bottom third, mid = middle third, high = top third).
            </p>
          </div>
        </div>
      </div>

      {/* 4. Hostel Usage Breakdown Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-200/80 bg-slate-50/60 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">Hostel Inventory Utilization</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">Hostel</th>
                <th className="px-6 py-3.5">Rooms Used</th>
                <th className="px-6 py-3.5">Beds Filled</th>
                <th className="px-6 py-3.5">Capacity Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hostelUsage.map((h) => {
                const utilPercent = h.totalBeds > 0 ? Math.round((h.bedsFilled / h.totalBeds) * 100) : 0;
                return (
                  <tr key={h.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-semibold text-slate-900">
                      {h.name} <span className="font-mono text-xs text-slate-400">({h.code})</span>
                    </td>
                    <td className="px-6 py-3 text-xs">
                      <strong>{h.roomsUsed}</strong> / {h.totalRooms} rooms
                    </td>
                    <td className="px-6 py-3 text-xs">
                      <strong>{h.bedsFilled}</strong> / {h.totalBeds} beds
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              utilPercent > 80 ? "bg-amber-500" : "bg-indigo-600"
                            }`}
                            style={{ width: `${utilPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{utilPercent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Waitlist Breakdown & Unallocated Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Waitlist Reasons Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Waitlist Diagnostics ({counts.unitsWaitlisted ?? 0} units)
          </h3>
          {Object.keys(waitlistReasonCounts).length === 0 ? (
            <p className="text-xs text-slate-500 py-3">Zero units were waitlisted in this run.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(waitlistReasonCounts).map(([reasonCode, count]) => {
                const meta = WAITLIST_REASONS[reasonCode] || { label: reasonCode };
                return (
                  <div key={reasonCode} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{meta.label}</span>
                      <span className="text-[11px] text-slate-500 block">{meta.description}</span>
                    </div>
                    <Badge variant="amber" size="sm">
                      {count} {count === 1 ? "unit" : "units"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Unallocated Students Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Unallocated Students ({counts.studentsUnallocated ?? 0})
            </h3>
            <button
              type="button"
              onClick={() => setShowUnallocated(!showUnallocated)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {showUnallocated ? "Hide List" : "View List"}
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Solo students who could not be placed due to incomplete preferences, inactive accounts, or lack of compatible roommate partners.
          </p>

          {showUnallocated && (
            <div className="pt-2">
              {loadingUnallocated ? (
                <div className="py-4 text-center text-xs text-slate-500">Loading unallocated students...</div>
              ) : unallocatedList.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No unallocated students in this run.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {unallocatedList.map((item, idx) => {
                    const u = item.user || {};
                    const meta = UNALLOCATED_REASONS[item.reason] || { label: item.reason };
                    return (
                      <div key={idx} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <span className="font-bold text-slate-800">{u.name || "Student"}</span>
                          <span className="text-[11px] text-slate-400 block font-mono">
                            {u.registrationNumber || u.email || "No Reg"}
                          </span>
                        </div>
                        <Badge variant="rose" size="sm">
                          {meta.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 6. Assignments Table with Filters */}
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
                  <th className="px-6 py-3.5">Round</th>
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
                        <Badge
                          variant={item.status === "assigned" ? "emerald" : "amber"}
                          size="sm"
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                        {item.waitlistReason && (
                          <span className="block text-[10px] text-amber-700 mt-0.5">
                            {item.waitlistReason}
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
                            title={
                              item.acMatch === true
                                ? "AC Matched"
                                : item.acMatch === false
                                ? "AC Not Matched"
                                : "No AC Preference"
                            }
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
                            title={
                              item.floorMatch === true
                                ? "Floor Band Matched"
                                : item.floorMatch === false
                                ? "Floor Band Not Matched"
                                : "No Floor Preference"
                            }
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
                      <td className="px-6 py-3.5 text-xs font-mono text-slate-500">
                        {item.round ? `Round ${item.round}` : "—"}
                      </td>
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
    </div>
  );
}
