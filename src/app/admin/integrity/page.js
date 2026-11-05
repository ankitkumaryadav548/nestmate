"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "@/lib/axios";
import {
  PageContainer,
  Card,
  Button,
  Badge,
  StatCard,
  AnimatedNumber,
  ConfirmDialog,
  Alert,
} from "@/components/ui";
import { AdminPageHeader } from "@/components/admin";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function AdminIntegrityPage() {
  useDocumentTitle("Integrity Diagnostic", true);
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
    <PageContainer maxWidth="7xl">
      <div className="space-y-6">
        {/* Header */}
        <AdminPageHeader
          title="System Integrity Diagnostic"
          description="Automated verification of room occupancies, student allocation uniqueness, and publication snapshots."
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Integrity" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              {hasOccupancyMismatches && (
                <Button
                  onClick={() => setIsFixDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  🛠️ Fix Occupancy
                </Button>
              )}
              <Button
                onClick={fetchIntegrity}
                disabled={loading}
                size="sm"
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold"
              >
                {loading ? "Running Check..." : "↻ Run Integrity Check"}
              </Button>
            </div>
          }
        />

        {fixMessage && (
          <Alert variant="success">
            {fixMessage}
          </Alert>
        )}

        {error && (
          <Alert
            variant="danger"
            action={
              <Button variant="outline" size="sm" onClick={fetchIntegrity}>
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Diagnostic Overview */}
        {loading ? (
          <div className="py-24 text-center rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">Scanning allocation invariants across database...</p>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Main Status Hero */}
            <div
              className={`rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
                report.isClean
                  ? "bg-teal-50/80 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200"
                  : "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-2xl shadow-sm ${
                    report.isClean ? "bg-teal-600 text-white" : "bg-rose-600 text-white"
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
                      : `${report.problems?.length ?? 0} integrity problem(s) require administrative review.`}
                  </p>
                </div>
              </div>

              <Badge variant={report.isClean ? "teal" : "rose"} size="lg">
                {report.isClean ? "HEALTHY" : "ATTENTION NEEDED"}
              </Badge>
            </div>

            {/* Stats Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                title="Rooms Checked"
                value={<AnimatedNumber value={report.stats?.roomsChecked ?? 0} />}
                subtitle="hostel rooms"
                variant="default"
              />
              <StatCard
                title="Active Allocations"
                value={<AnimatedNumber value={report.stats?.allocationsChecked ?? 0} />}
                subtitle="live placements"
                variant="teal"
              />
              <StatCard
                title="Locked Groups"
                value={<AnimatedNumber value={report.stats?.groupsChecked ?? 0} />}
                subtitle="finalized groups"
                variant="brand"
              />
              <StatCard
                title="Published Runs"
                value={<AnimatedNumber value={report.stats?.publishedRunsChecked ?? 0} />}
                subtitle="live run records"
                variant="default"
              />
            </div>

            {/* Problems List */}
            {!report.isClean && (
              <Card className="overflow-hidden">
                <div className="bg-[var(--muted)]/40 px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    Integrity Discrepancies ({report.problems?.length ?? 0})
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
                <div className="divide-y divide-[var(--border)]">
                  {report.problems?.map((prob, idx) => (
                    <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-[var(--muted)]/30 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={prob.severity === "critical" ? "rose" : "amber"} size="sm">
                            {prob.code.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                          {prob.entityId && (
                            <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                              ID: {prob.entityId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--foreground)] font-medium leading-relaxed">
                          {prob.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
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
    </PageContainer>
  );
}
