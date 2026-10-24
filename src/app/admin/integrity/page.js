"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function AdminIntegrityPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fix occupancy state
  const [isFixDialogOpen, setIsFixDialogOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState(null);

  const fetchIntegrity = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFixMessage(null);
    try {
      const res = await axios.get("/api/admin/integrity");
      if (res.data?.success) {
        setReport(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to execute integrity check");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrity();
  }, [fetchIntegrity]);

  const handleFixOccupancy = async () => {
    setIsFixing(true);
    try {
      const res = await axios.post("/api/admin/integrity/fix-occupancy");
      if (res.data?.success) {
        setFixMessage(res.data.message || "Occupancy repaired successfully");
        setIsFixDialogOpen(false);
        fetchIntegrity();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to fix occupancy");
    } finally {
      setIsFixing(false);
    }
  };

  const hasOccupancyMismatches = report?.problems?.some(
    (p) => p.code === "room_occupancy_mismatch"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Integrity Diagnostic
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated verification of room occupancies, student allocation uniqueness, and publication snapshots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasOccupancyMismatches && (
            <Button
              onClick={() => setIsFixDialogOpen(true)}
              variant="outline"
              className="border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              🛠️ Fix Occupancy
            </Button>
          )}
          <Button
            onClick={fetchIntegrity}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            {loading ? "Running Check..." : "↻ Run Integrity Check"}
          </Button>
        </div>
      </div>

      {fixMessage && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in">
          ✓ {fixMessage}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      {/* Diagnostic Overview Card */}
      {loading ? (
        <div className="py-24 text-center rounded-2xl border border-slate-200 bg-white">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Scanning allocation invariants across database...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Main Status Hero */}
          <div
            className={`rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
              report.isClean
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                : "bg-rose-50/80 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-2xl shadow-sm ${
                  report.isClean ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                }`}
              >
                {report.isClean ? "✓" : "!"}
              </span>
              <div>
                <h2 className="text-lg font-bold">
                  {report.isClean ? "All System Invariants Healthy" : "Discrepancies Detected"}
                </h2>
                <p className="text-xs mt-0.5 opacity-90">
                  {report.isClean
                    ? "Physical room occupancies, student allocations, and group locks are fully synchronized."
                    : `${report.problems.length} integrity problem(s) require administrative review.`}
                </p>
              </div>
            </div>

            <Badge variant={report.isClean ? "emerald" : "rose"} size="lg">
              {report.isClean ? "HEALTHY" : "ATTENTION NEEDED"}
            </Badge>
          </div>

          {/* Stats Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Rooms Checked</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {report.stats?.roomsChecked ?? 0}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Active Allocations</span>
              <span className="text-xl font-bold text-emerald-600 mt-1 block">
                {report.stats?.allocationsChecked ?? 0}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Locked Groups</span>
              <span className="text-xl font-bold text-indigo-600 mt-1 block">
                {report.stats?.groupsChecked ?? 0}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Published Runs</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {report.stats?.publishedRunsChecked ?? 0}
              </span>
            </div>
          </div>

          {/* Problems List */}
          {!report.isClean && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Integrity Discrepancies ({report.problems.length})
                </h3>
                {hasOccupancyMismatches && (
                  <Button
                    size="sm"
                    onClick={() => setIsFixDialogOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                  >
                    Fix Occupancies Now
                  </Button>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {report.problems.map((prob, idx) => (
                  <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={prob.severity === "critical" ? "rose" : "amber"} size="sm">
                          {prob.code.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                        {prob.entityId && (
                          <span className="text-[11px] font-mono text-slate-400">
                            ID: {prob.entityId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {prob.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Confirmation Dialog for Repair */}
      <ConfirmDialog
        isOpen={isFixDialogOpen}
        title="Repair Room Occupancy Discrepancies"
        message="This will recalculate currentOccupancy and status for all active rooms based on official active Allocation records. Rooms under maintenance will not be altered. Proceed?"
        confirmLabel={isFixing ? "Repairing..." : "Repair Occupancies"}
        onConfirm={handleFixOccupancy}
        onCancel={() => setIsFixDialogOpen(false)}
      />
    </div>
  );
}
