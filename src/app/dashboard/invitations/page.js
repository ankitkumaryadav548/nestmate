"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";

export default function StudentInvitationsPage() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const [processingId, setProcessingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    action: null,
    variant: "primary",
  });

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/invitations/me");
      if (res.data?.success) {
        setPending(res.data.data?.pending || []);
        setHistory(res.data.data?.history || []);
      }
    } catch (err) {
      console.error("Failed to load invitations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleAccept = async (invitationId) => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    setProcessingId(invitationId);
    setAlertMessage(null);
    try {
      const res = await api.post(`/invitations/${invitationId}/accept`);
      if (res.data?.success) {
        setAlertMessage({
          type: "success",
          message: "You have joined the group! Redirecting to group page...",
        });
        setTimeout(() => {
          window.location.href = "/dashboard/group";
        }, 1200);
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Failed to accept invitation",
      });
    } finally {
      setProcessingId(null);
      fetchInvitations();
    }
  };

  const handleDecline = async (invitationId) => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    setProcessingId(invitationId);
    setAlertMessage(null);
    try {
      const res = await api.post(`/invitations/${invitationId}/decline`);
      if (res.data?.success) {
        setAlertMessage({ type: "info", message: "Invitation declined" });
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Failed to decline invitation",
      });
    } finally {
      setProcessingId(null);
      fetchInvitations();
    }
  };

  const getScoreTheme = (score) => {
    if (score >= 85) return { badge: "emerald", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
    if (score >= 70) return { badge: "indigo", text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" };
    if (score >= 50) return { badge: "amber", text: "text-amber-800", bg: "bg-amber-50", border: "border-amber-200" };
    return { badge: "default", text: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" };
  };

  return (
    <div className="mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Roommate Invitations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review invitations from group leaders wishing to room with you.
          </p>
        </div>

        <Link
          href="/dashboard/group"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <span>🏠</span> Go to My Group
        </Link>
      </div>

      {alertMessage && (
        <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />
      )}

      {/* Pending Invitations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Pending Invitations ({pending.length})
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-2xl border border-slate-200 bg-white p-6 animate-pulse" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon="✉️"
            title="No Pending Invitations"
            description="You have no incoming invitations right now. You can create your own group or explore roommate matches."
            action={
              <Link
                href="/dashboard/group"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700 transition-all"
              >
                Create a Group &rarr;
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {pending.map((inv) => (
              <div
                key={inv.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Invitation from {inv.leaderName}
                    </h3>
                    <Badge variant="indigo" size="sm">
                      {inv.targetSize}-Bed Room
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500">
                    Leader: {inv.leaderCourse} {inv.leaderYear ? `• Year ${inv.leaderYear}` : ""}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-xs text-slate-600">
                      Seats Filled: <strong>{inv.seatsFilled} / {inv.targetSize}</strong>
                    </span>

                    {inv.scoreSnapshot?.average > 0 && (
                      <span
                        className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          getScoreTheme(inv.scoreSnapshot.average).border
                        } ${getScoreTheme(inv.scoreSnapshot.average).bg} ${
                          getScoreTheme(inv.scoreSnapshot.average).text
                        }`}
                      >
                        {inv.scoreSnapshot.average}% Compatibility
                      </span>
                    )}

                    <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/80">
                      ⏳ Expires in {inv.daysLeft} day{inv.daysLeft === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={processingId === inv.id}
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        title: "Decline Invitation",
                        message: `Are you sure you want to decline this invitation from ${inv.leaderName}?`,
                        action: () => handleDecline(inv.id),
                        variant: "warning",
                      })
                    }
                  >
                    Decline
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    loading={processingId === inv.id}
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        title: "Join Roommate Group",
                        message: `Accept invitation to join ${inv.leaderName}'s ${inv.targetSize}-bed room group? This will cancel any other pending invitations.`,
                        action: () => handleAccept(inv.id),
                        variant: "primary",
                      })
                    }
                  >
                    Accept & Join &rarr;
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Collapsible Section */}
      {history.length > 0 && (
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900"
          >
            <span>{historyOpen ? "▼" : "▶"}</span>
            <span>Past Invitations History ({history.length})</span>
          </button>

          {historyOpen && (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {history.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">
                      {inv.targetSize}-Bed Group (Leader: {inv.leaderName})
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Received {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <Badge
                    variant={
                      inv.status === "accepted"
                        ? "emerald"
                        : inv.status === "declined"
                        ? "amber"
                        : "default"
                    }
                    size="sm"
                  >
                    {inv.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
