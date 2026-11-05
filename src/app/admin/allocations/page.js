"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import {
  PageContainer,
  Card,
  Badge,
  Button,
  Modal,
  ConfirmDialog,
  Alert,
  Input,
  Select,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui";
import {
  AdminPageHeader,
  DataTable,
  StatusBadge,
} from "@/components/admin";
import { PRIORITY_MODES, PRIORITY_MODE_DETAILS } from "@/config/allocation";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function AdminAllocationsPage() {
  useDocumentTitle("Allocation Runs", true);
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
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Simulation Safety Guarantee Banner */}
      <div className="mb-6 flex items-center gap-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 p-4 text-indigo-900 dark:text-indigo-300 shadow-xs">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-xs">
          ⚡
        </span>
        <div className="text-xs sm:text-sm">
          <p className="font-bold">Draft Simulation Engine</p>
          <p className="text-indigo-800 dark:text-indigo-300/80 mt-0.5">
            Simulation only. Running this does <strong>NOT</strong> modify physical room occupancy, roommate groups, or student assignment records until explicitly published.
          </p>
        </div>
      </div>

      {/* Header */}
      <AdminPageHeader
        title="Automated Allocations"
        description="Run multi-round priority simulations, examine random baseline comparisons, and inspect room placements."
        breadcrumbs={[{ label: "Allocations" }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
          >
            <span className="mr-1.5 text-base">▶</span> Run Simulation
          </Button>
        }
      />

      {error && (
        <div className="mb-6">
          <Alert
            variant="danger"
            title="Error"
            onClose={() => setError(null)}
            action={
              <Button variant="outline" size="sm" onClick={() => fetchRuns(pagination.page)}>
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        </div>
      )}

      {/* Runs DataTable */}
      <DataTable
        isLoading={loading}
        isEmpty={!error && runs.length === 0}
        emptyTitle="No allocation simulations executed yet"
        emptyDescription="Launch your first draft simulation to cluster students, place groups by priority rounds, and evaluate satisfaction metrics."
        emptyAction={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            Run First Simulation
          </Button>
        }
        pagination={{
          currentPage: pagination.page,
          totalPages: pagination.pages,
          totalItems: pagination.total,
          onPageChange: (p) => fetchRuns(p),
        }}
        skeletonRows={6}
        skeletonCols={8}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Run Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Mode &amp; Seed</TableHead>
            <TableHead>Allocated</TableHead>
            <TableHead>Waitlist</TableHead>
            <TableHead>Execution</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const counts = run.stats?.counts || {};
            return (
              <TableRow key={run._id}>
                {/* Run Name */}
                <TableCell>
                  <Link
                    href={`/admin/allocations/${run._id}`}
                    className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block"
                  >
                    {run.name}
                  </Link>
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <StatusBadge type="run" status={run.status} />
                </TableCell>

                {/* Mode & Seed */}
                <TableCell>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    <span className="font-sans font-semibold capitalize text-slate-800 dark:text-slate-200 block">
                      {run.options?.priorityMode || "lottery"}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] block">
                      Seed: {run.options?.seed ?? "N/A"}
                    </span>
                  </div>
                </TableCell>

                {/* Allocated */}
                <TableCell>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {counts.studentsAllocated ?? "—"}
                    </span>{" "}
                    <span className="text-xs text-slate-400">students</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {counts.roomsUsed ?? 0} rooms used
                    </span>
                  </div>
                </TableCell>

                {/* Waitlist */}
                <TableCell>
                  <div>
                    <span
                      className={`font-semibold font-mono ${
                        run.waitlistCount > 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {run.waitlistCount || 0}
                    </span>{" "}
                    <span className="text-xs text-slate-400">units</span>
                  </div>
                </TableCell>

                {/* Execution Duration */}
                <TableCell>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {run.stats?.durationMs ? `${run.stats.durationMs}ms` : "—"}
                  </span>
                </TableCell>

                {/* Created */}
                <TableCell>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {new Date(run.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link href={`/admin/allocations/${run._id}`}>
                      <Button variant="ghost" size="xs" className="text-indigo-600 dark:text-indigo-400">
                        View &rarr;
                      </Button>
                    </Link>
                    {(run.status === "draft" || run.status === "failed" || run.status === "discarded") && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setDeleteRunId(run._id)}
                        className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </DataTable>

      {/* Run Simulation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Execute Allocation Simulation"
        description="Configure priority rounds, seed reproducibility, and grouping rules for this draft placement run."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleStartSimulation} className="space-y-4">
          {formError && (
            <Alert variant="danger" title="Simulation Error">
              {formError}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Priority Mode
              </label>
              <Select
                value={formData.priorityMode}
                onChange={(val) => setFormData({ ...formData, priorityMode: val })}
                options={[
                  { value: "lottery", label: "Random Lottery" },
                  { value: "seniority", label: "Academic Seniority (Year 4 &rarr; 1)" },
                  { value: "first_come_first_served", label: "Application Timestamp (FCFS)" },
                  { value: "distance", label: "Geographic Distance" },
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Reproducibility Seed (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. 12345 (Leave empty for random)"
                value={formData.seed}
                onChange={(e) => setFormData({ ...formData, seed: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Gender Filter
              </label>
              <Select
                value={formData.gender}
                onChange={(val) => setFormData({ ...formData, gender: val })}
                options={[
                  { value: "all", label: "All Students (Male & Female)" },
                  { value: "male", label: "Male Students Only" },
                  { value: "female", label: "Female Students Only" },
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Max Swap Optimization Passes
              </label>
              <Input
                type="number"
                min="0"
                max="10"
                value={formData.maxSwapPasses}
                onChange={(e) => setFormData({ ...formData, maxSwapPasses: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="includeUngrouped"
              checked={formData.includeUngrouped}
              onChange={(e) => setFormData({ ...formData, includeUngrouped: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="includeUngrouped" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Include ungrouped / individual auto-pool students
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSimulating}>
              Execute Simulation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteRunId)}
        onClose={() => setDeleteRunId(null)}
        onConfirm={handleDelete}
        title="Delete Allocation Run?"
        message="Are you sure you want to delete this draft simulation run? All draft room placements, comparison metrics, and assignments in this run will be deleted permanently."
        confirmText="Delete Run"
        variant="danger"
        isLoading={isDeleting}
      />
    </PageContainer>
  );
}
