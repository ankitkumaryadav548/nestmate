"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";

export default function StudentInvitationsPage() {
  const [loading, setLoading]         = useState(true);
  const [pending, setPending]         = useState([]);
  const [history, setHistory]         = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Confirmation state — kept separate from the async action
  const [dialog, setDialog] = useState({ isOpen: false, type: null, inv: null });

  // Use a ref so the confirm handler always gets the latest inv.id without stale closure
  const pendingActionRef = useRef(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/invitations/me");
      if (res.data?.success) {
        setPending(res.data.data?.pending || []);
        setHistory(res.data.data?.history  || []);
      }
    } catch (err) {
      console.error("Failed to load invitations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  /* ─── open dialog ─────────────────────────────────────────── */
  const openAcceptDialog  = (inv) => setDialog({ isOpen: true, type: "accept",  inv });
  const openDeclineDialog = (inv) => setDialog({ isOpen: true, type: "decline", inv });
  const closeDialog       = ()    => setDialog({ isOpen: false, type: null, inv: null });

  /* ─── confirmed actions ────────────────────────────────────── */
  const handleConfirm = async () => {
    const { type, inv } = dialog;
    closeDialog();

    if (!inv) return;
    setProcessingId(inv.id);
    setAlertMessage(null);

    try {
      if (type === "accept") {
        const res = await api.post(`/invitations/${inv.id}/accept`);
        if (res.data?.success) {
          setAlertMessage({
            type: "success",
            message: "You have joined the group! Redirecting…",
          });
          setTimeout(() => { window.location.href = "/dashboard/group"; }, 1200);
        }
      } else {
        const res = await api.post(`/invitations/${inv.id}/decline`);
        if (res.data?.success) {
          setAlertMessage({ type: "info", message: "Invitation declined." });
          fetchInvitations();
        }
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Action failed. Please try again.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  /* ─── helpers ──────────────────────────────────────────────── */
  const getScoreTheme = (score) => {
    if (score >= 85) return { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700" };
    if (score >= 70) return { border: "border-indigo-200",  bg: "bg-indigo-50",  text: "text-indigo-700"  };
    if (score >= 50) return { border: "border-amber-200",   bg: "bg-amber-50",   text: "text-amber-800"   };
    return             { border: "border-slate-200",   bg: "bg-slate-50",   text: "text-slate-700"   };
  };

  /* ─── inline confirmation overlay ─────────────────────────── */
  const ConfirmOverlay = () => {
    if (!dialog.isOpen || !dialog.inv) return null;
    const isAccept = dialog.type === "accept";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={closeDialog}
        />
        {/* card */}
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isAccept ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
              }`}
            >
              {isAccept ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              )}
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {isAccept ? "Join Roommate Group?" : "Decline Invitation?"}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {isAccept
                  ? `You are about to join ${dialog.inv.leaderName}'s ${dialog.inv.targetSize}-bed room group. Any other pending invitations will be cancelled automatically.`
                  : `Are you sure you want to decline this invitation from ${dialog.inv.leaderName}?`}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" size="sm" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={isAccept ? "primary" : "danger"}
              size="sm"
              onClick={handleConfirm}
            >
              {isAccept ? "Yes, Join Group →" : "Yes, Decline"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  /* ─── render ───────────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <ConfirmOverlay />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Roommate Invitations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review incoming invitations from students who want to room with you.
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
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}

      {/* Pending Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
          Pending Invitations ({pending.length})
        </h2>

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
            description="You have no incoming invitations right now. Explore roommate matches to find compatible students."
            action={
              <Link
                href="/dashboard/matches"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700 transition-all"
              >
                Find Roommates →
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
                {/* Info */}
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
                    {inv.leaderCourse}{inv.leaderYear ? ` • Year ${inv.leaderYear}` : ""}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <span className="text-xs text-slate-600">
                      Seats Filled: <strong>{inv.seatsFilled} / {inv.targetSize}</strong>
                    </span>

                    {inv.scoreSnapshot?.average > 0 && (() => {
                      const t = getScoreTheme(inv.scoreSnapshot.average);
                      return (
                        <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${t.border} ${t.bg} ${t.text}`}>
                          {inv.scoreSnapshot.average}% Compatibility
                        </span>
                      );
                    })()}

                    <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/80">
                      ⏳ Expires in {inv.daysLeft} day{inv.daysLeft === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={processingId === inv.id}
                    disabled={!!processingId}
                    onClick={() => openDeclineDialog(inv)}
                  >
                    Decline
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    isLoading={processingId === inv.id}
                    disabled={!!processingId}
                    onClick={() => openAcceptDialog(inv)}
                  >
                    Accept &amp; Join →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
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
                      {inv.targetSize}-Bed Group — {inv.leaderName}
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
    </div>
  );
}
