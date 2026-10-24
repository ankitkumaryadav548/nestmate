"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { PRIORITY_MODES, PRIORITY_MODE_DETAILS } from "@/config/allocation";

export default function AdminAllocationsPage() {
  const [runs, setRuns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Simulation Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [formError, setFormError] = useState(null);

  // Simulation form options
  const [formData, setFormData] = useState({
    seed: "",
    priorityMode: "lottery",
    gender: "all",
    studentScope: "all",
    includeUngrouped: true,
    defaultRoomSize: 2,
    incompleteGroupPolicy: "shrink",
    maxSwapPasses: 3,
  });

  // Delete dialog state
  const [deleteRunId, setDeleteRunId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRuns = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/admin/allocations?page=${page}&limit=10`);
      if (res.data?.success) {
        setRuns(res.data.data.runs || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load allocation runs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns(1);
  }, [fetchRuns]);

  const handleStartSimulation = async (e) => {
    e.preventDefault();
    setIsSimulating(true);
    setFormError(null);

    try {
      const payload = {
        ...formData,
        seed: formData.seed.trim() ? (isNaN(formData.seed) ? formData.seed.trim() : Number(formData.seed)) : null,
        defaultRoomSize: Number(formData.defaultRoomSize),
        maxSwapPasses: Number(formData.maxSwapPasses),
      };

      const res = await axios.post("/api/admin/allocations/run", payload);
      if (res.data?.success) {
        setIsModalOpen(false);
        fetchRuns(1);
        const newRunId = res.data.data?.runId;
        if (newRunId) {
          window.location.href = `/admin/allocations/${newRunId}`;
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || "Failed to execute simulation");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRunId) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/api/admin/allocations/${deleteRunId}`);
      setDeleteRunId(null);
      fetchRuns(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete run");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Safety Guarantee Banner */}
      <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 p-4 text-indigo-900 shadow-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-sm">
          ⚡
        </span>
        <div className="text-xs sm:text-sm">
          <p className="font-bold">Draft Simulation Engine</p>
          <p className="text-indigo-700 mt-0.5">
            Simulation only. Running this does <strong>NOT</strong> modify any physical room occupancy, roommate group, or student enrollment records.
          </p>
        </div>
      </div>

      {/* Header & Run Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Automated Allocations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Run multi-round priority simulations, examine random baseline comparisons, and inspect room placements.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
        >
          <span className="mr-1.5 text-base">▶</span> Run Simulation
        </Button>
      </div>

      {/* Runs Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-200/80 bg-slate-50/60 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Simulation History</h2>
          <span className="text-xs text-slate-500">
            Showing {runs.length} of {pagination.total} runs
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-3 text-sm text-slate-500">Loading allocation history...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
        ) : runs.length === 0 ? (
          <EmptyState
            title="No allocation simulations executed yet"
            description="Launch your first draft simulation to cluster students, place groups by priority rounds, and evaluate satisfaction metrics."
            actionLabel="Run First Simulation"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-3.5">Run Name</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Mode & Seed</th>
                  <th className="px-6 py-3.5">Allocated</th>
                  <th className="px-6 py-3.5">Waitlist</th>
                  <th className="px-6 py-3.5">Execution</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((run) => {
                  const counts = run.stats?.counts || {};
                  return (
                    <tr key={run._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <Link
                          href={`/admin/allocations/${run._id}`}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {run.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            run.status === "published"
                              ? "emerald"
                              : run.status === "draft"
                              ? "blue"
                              : run.status === "publishing" || run.status === "running"
                              ? "amber"
                              : run.status === "rolled_back"
                              ? "default"
                              : run.status === "discarded"
                              ? "default"
                              : "rose"
                          }
                          size="sm"
                        >
                          {run.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-600">
                        <span className="font-sans font-semibold capitalize text-slate-800">
                          {run.options?.priorityMode || "lottery"}
                        </span>
                        <span className="text-slate-400 block text-[11px]">
                          Seed: {run.options?.seed ?? "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900">
                          {counts.studentsAllocated ?? "—"}
                        </span>{" "}
                        <span className="text-xs text-slate-400">students</span>
                        <span className="block text-[11px] text-slate-500">
                          {counts.roomsUsed ?? 0} rooms
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-semibold ${
                            run.waitlistCount > 0 ? "text-amber-700" : "text-slate-500"
                          }`}
                        >
                          {run.waitlistCount || 0}
                        </span>{" "}
                        <span className="text-xs text-slate-400">units</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {run.stats?.durationMs ? `${run.stats.durationMs}ms` : "—"}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(run.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link
                          href={`/admin/allocations/${run._id}`}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm"
                        >
                          View
                        </Link>
                        {(run.status === "draft" || run.status === "failed" || run.status === "discarded") && (
                          <button
                            type="button"
                            onClick={() => setDeleteRunId(run._id)}
                            className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100/80 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-200/80">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(p) => fetchRuns(p)}
            />
          </div>
        )}
      </div>

      {/* Run Simulation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSimulating && setIsModalOpen(false)}
        title="Execute Allocation Simulation"
        description="Configure deterministic parameters for the room allocation engine."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleStartSimulation} className="space-y-5 overflow-y-auto pr-1">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
              {formError}
            </div>
          )}

          {/* Seed Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Random Seed (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 42 (leave blank to generate automatically)"
              value={formData.seed}
              onChange={(e) => setFormData({ ...formData, seed: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isSimulating}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Re-running with the identical seed and data guarantees the exact same allocation results.
            </p>
          </div>

          {/* Priority Mode Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Unit Priority Policy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRIORITY_MODES.map((modeKey) => {
                const info = PRIORITY_MODE_DETAILS[modeKey];
                const isSelected = formData.priorityMode === modeKey;
                return (
                  <label
                    key={modeKey}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{info.label}</span>
                        <input
                          type="radio"
                          name="priorityMode"
                          value={modeKey}
                          checked={isSelected}
                          onChange={(e) => setFormData({ ...formData, priorityMode: e.target.value })}
                          className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                          disabled={isSimulating}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{info.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Gender Filter & Student Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Gender Isolation Pool
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isSimulating}
              >
                <option value="all">All Genders (Independent Pools)</option>
                <option value="male">Male Students & Boys/Mixed Hostels</option>
                <option value="female">Female Students & Girls/Mixed Hostels</option>
                <option value="other">Other Students & Mixed Hostels</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Student Scope
              </label>
              <select
                value={formData.studentScope}
                onChange={(e) => setFormData({ ...formData, studentScope: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isSimulating}
              >
                <option value="all">All Registered Students</option>
                <option value="demo">Demo Accounts Only (isDemo: true)</option>
                <option value="real">Real Enrollments Only (isDemo: false)</option>
              </select>
            </div>
          </div>

          {/* Incomplete Group Policy & Default Room Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Incomplete Group Policy
              </label>
              <select
                value={formData.incompleteGroupPolicy}
                onChange={(e) => setFormData({ ...formData, incompleteGroupPolicy: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isSimulating}
              >
                <option value="shrink">Shrink (groups with &ge; 2 members placed in smaller rooms)</option>
                <option value="waitlist">Waitlist (place on waitlist until full)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Default Room Size for Solo Pool
              </label>
              <select
                value={formData.defaultRoomSize}
                onChange={(e) => setFormData({ ...formData, defaultRoomSize: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={isSimulating}
              >
                <option value={2}>2 Beds (Double Occupancy)</option>
                <option value={3}>3 Beds (Triple Occupancy)</option>
                <option value={4}>4 Beds (Quad Occupancy)</option>
              </select>
            </div>
          </div>

          {/* Include Ungrouped Students Checkbox */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeUngrouped}
                onChange={(e) => setFormData({ ...formData, includeUngrouped: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                disabled={isSimulating}
              />
              <div>
                <span className="font-semibold text-xs text-slate-900 block">
                  Include Ungrouped Students
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5 leading-normal">
                  Automatically cluster students with completed preferences who did not form a group and did not explicitly select auto-assign mode.
                </span>
              </div>
            </label>
          </div>

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSimulating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSimulating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
            >
              {isSimulating ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Running...
                </span>
              ) : (
                "Start Simulation"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteRunId)}
        title="Delete Allocation Draft"
        message="Are you sure you want to delete this draft run and all associated assignment records? This action cannot be undone."
        confirmLabel={isDeleting ? "Deleting..." : "Delete Run"}
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteRunId(null)}
      />
    </div>
  );
}
