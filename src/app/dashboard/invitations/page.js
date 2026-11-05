"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { useToast } from "@/context/ToastContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  Badge,
  Button,
  Tabs,
  ConfirmDialog,
  Alert,
  EmptyState,
  ErrorState,
  ScoreRing,
  Avatar,
  CountdownBadge,
  PageTransition,
  Reveal,
  IconUsers,
  IconCheck,
  IconClose,
  IconSparkles,
} from "@/components/ui";
import { getScoreTone, getScoreClasses } from "@/components/ui/ScoreTone";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function StudentInvitationsPage() {
  useDocumentTitle("Invitations & Requests");
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("invitations"); // "invitations" | "join-requests"
  const [loading, setLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState(null);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Sent join requests state
  const [sentRequests, setSentRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState(null);
  const [cancellingRequestId, setCancellingRequestId] = useState(null);

  // Confirmation state for invitation response
  const [dialog, setDialog] = useState({ isOpen: false, type: null, inv: null });

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    setInvitationsError(null);
    try {
      const res = await api.get("/invitations/me");
      if (res.data?.success) {
        setPending(res.data.data?.pending || []);
        setHistory(res.data.data?.history || []);
      }
    } catch (err) {
      console.error("Failed to load invitations:", err);
      setInvitationsError(err.response?.data?.message || err.message || "Failed to load invitations. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSentRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const res = await api.get("/join-requests/me");
      if (res.data?.success) {
        setSentRequests(res.data.data?.requests || []);
      }
    } catch (err) {
      console.error("Failed to load sent join requests:", err);
      setRequestsError(err.response?.data?.message || err.message || "Failed to load sent join requests. Please check your network connection.");
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
    fetchSentRequests();
  }, [fetchInvitations, fetchSentRequests]);

  const openAcceptDialog = (inv) => setDialog({ isOpen: true, type: "accept", inv });
  const openDeclineDialog = (inv) => setDialog({ isOpen: true, type: "decline", inv });
  const closeDialog = () => setDialog({ isOpen: false, type: null, inv: null });

  const handleConfirm = async () => {
    const { type, inv } = dialog;
    closeDialog();

    if (!inv) return;
    setProcessingId(inv.id);

    try {
      if (type === "accept") {
        const res = await api.post(`/invitations/${inv.id}/accept`);
        if (res.data?.success) {
          showToast("You have joined the group! Redirecting...", "success");
          setTimeout(() => {
            window.location.href = "/dashboard/group";
          }, 1200);
        }
      } else {
        const res = await api.post(`/invitations/${inv.id}/decline`);
        if (res.data?.success) {
          showToast("Invitation declined.", "info");
          fetchInvitations();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed. Please try again.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelRequest = async (requestId) => {
    setCancellingRequestId(requestId);
    try {
      const res = await api.delete(`/join-requests/${requestId}`);
      if (res.data?.success) {
        showToast("Join request cancelled.", "info");
        fetchSentRequests();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel request.", "error");
    } finally {
      setCancellingRequestId(null);
    }
  };

  const getCloseReasonLabel = (reason) => {
    switch (reason) {
      case "group_full":
        return "Group filled by other members";
      case "group_disbanded":
        return "Group was disbanded";
      case "group_locked":
        return "Selection finalized / group locked";
      case "requester_joined_elsewhere":
        return "You joined another group";
      case "expired":
        return "Request expired after 7 days";
      case "cancelled_by_admin":
        return "Cancelled by administrator";
      case "cancelled_by_requester":
        return "Cancelled by you";
      default:
        return reason || "Closed";
    }
  };

  const pendingRequestsCount = sentRequests.filter((r) => r.status === "pending").length;

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Header */}
        <Reveal direction="down">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <IconUsers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-heading">
                  Invitations &amp; Join Requests
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Review incoming roommate invitations and track requests you sent to join existing groups.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link href="/dashboard/matches">
                <Button variant="secondary" size="sm">
                  ðŸ” Browse Matches
                </Button>
              </Link>
              <Link href="/dashboard/group">
                <Button variant="outline" size="sm">
                  ðŸ  My Group
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Tabs */}
        <Reveal direction="up" delay={50}>
          <div className="border-b border-slate-200 dark:border-slate-800">
            <Tabs
              tabs={[
                { id: "invitations", label: `Received Invitations (${pending.length})` },
                { id: "join-requests", label: `My Sent Join Requests (${pendingRequestsCount})` },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="underline"
            />
          </div>
        </Reveal>

        {/* TAB 1: RECEIVED INVITATIONS */}
        {activeTab === "invitations" && (
          <div className="space-y-6">
            <Reveal direction="up" delay={100}>
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <Card key={i} className="p-6 h-36 animate-pulse" />
                    ))}
                  </div>
                ) : invitationsError ? (
                  <ErrorState
                    title="Failed to Load Invitations"
                    message={invitationsError}
                    onRetry={fetchInvitations}
                  />
                ) : pending.length === 0 ? (
                  <EmptyState
                    icon="âœ‰ï¸"
                    title="No Pending Invitations"
                    description="You have no incoming invitations right now. Explore roommate matches to find compatible students or request to join an open group."
                    action={
                      <Link href="/dashboard/matches">
                        <Button variant="primary">Find Roommates &rarr;</Button>
                      </Link>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {pending.map((inv, idx) => {
                      const score = inv.scoreSnapshot?.average || 0;
                      return (
                        <Reveal key={inv.id} direction="up" delay={Math.min(idx * 50, 400)}>
                          <Card
                            variant="interactive"
                            className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
                          >
                            <div className="space-y-2.5 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <Avatar name={inv.leaderName} size="md" />
                                <div>
                                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                                    Invitation from {inv.leaderName}
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {inv.targetSize}-Bed Room Group â€¢ Leader: {inv.leaderCourse || "Student"} {inv.leaderYear ? `â€¢ Year ${inv.leaderYear}` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                <Badge variant="neutral" size="sm">
                                  Seats: {inv.seatsFilled || 1} / {inv.targetSize}
                                </Badge>
                                <CountdownBadge targetDate={inv.expiresAt} prefix="â³ Expires in " />
                              </div>

                              {inv.scoreSnapshot?.perMemberScores?.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Members:</span>
                                  {inv.scoreSnapshot.perMemberScores.map((m, i) => (
                                    <Badge key={i} variant={getScoreTone(m.score)} size="sm">
                                      {m.memberName?.split(" ")[0]}: {m.score}%
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Score Gauge & Action Buttons */}
                            <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                              <div className="text-center">
                                <ScoreRing score={score} size={48} strokeWidth={4} />
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mt-1">
                                  Group Fit
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeclineDialog(inv)}
                                  disabled={processingId === inv.id}
                                >
                                  Decline
                                </Button>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => openAcceptDialog(inv)}
                                  loading={processingId === inv.id}
                                  disabled={processingId === inv.id}
                                >
                                  Accept &amp; Join &rarr;
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </Reveal>
                      );
                    })}
                  </div>
                )}
              </div>
            </Reveal>

            {/* History Section (Collapsible) */}
            {history.length > 0 && (
              <Reveal direction="up" delay={200}>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(!historyOpen)}
                    className="flex items-center justify-between w-full py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <span>Past Invitations ({history.length})</span>
                    <span>{historyOpen ? "â–² Hide" : "â–¼ Show"}</span>
                  </button>

                  {historyOpen && (
                    <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      {history.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-3.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Invitation from {inv.leaderName}
                            </span>
                            <span className="text-slate-400 block text-[11px]">
                              {inv.targetSize}-Bed Room Group
                            </span>
                          </div>
                          <Badge
                            variant={
                              inv.status === "accepted"
                                ? "success"
                                : inv.status === "declined"
                                ? "neutral"
                                : "warning"
                            }
                            size="sm"
                          >
                            {inv.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            )}
          </div>
        )}

        {/* TAB 2: SENT JOIN REQUESTS */}
        {activeTab === "join-requests" && (
          <div className="space-y-6">
            <Reveal direction="up" delay={100}>
              <div className="space-y-4">
                {requestsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <Card key={i} className="p-6 h-36 animate-pulse" />
                    ))}
                  </div>
                ) : requestsError ? (
                  <ErrorState
                    title="Failed to Load Sent Requests"
                    message={requestsError}
                    onRetry={fetchSentRequests}
                  />
                ) : sentRequests.length === 0 ? (
                  <EmptyState
                    icon="ðŸ“¤"
                    title="No Sent Join Requests"
                    description="You haven't requested to join any open groups yet. Browse groups looking for roommates and send a request."
                    action={
                      <Link href="/dashboard/matches">
                        <Button variant="primary">Browse Open Groups &rarr;</Button>
                      </Link>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {sentRequests.map((req, idx) => {
                      const isPending = req.status === "pending";
                      return (
                        <Reveal key={req.id} direction="up" delay={Math.min(idx * 50, 400)}>
                          <Card variant="interactive" className="p-5 sm:p-6 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Avatar name={req.group?.leaderName || "Leader"} size="md" />
                                <div>
                                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                                    Request to {req.group?.leaderName}&apos;s Group
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {req.group?.targetSize}-Bed Room Group
                                  </p>
                                </div>
                              </div>

                              <Badge
                                variant={
                                  req.status === "approved"
                                    ? "success"
                                    : req.status === "rejected"
                                    ? "danger"
                                    : req.status === "pending"
                                    ? "warning"
                                    : "neutral"
                                }
                                size="sm"
                              >
                                {req.status === "pending" ? "Pending Leader Review" : req.status}
                              </Badge>
                            </div>

                            {req.message && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                &ldquo;{req.message}&rdquo;
                              </p>
                            )}

                            {req.status === "closed" && (
                              <p className="text-xs text-slate-500">
                                Note: {getCloseReasonLabel(req.closeReason)}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                              <CountdownBadge targetDate={req.expiresAt} prefix="â³ " />

                              {isPending && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelRequest(req.id)}
                                  loading={cancellingRequestId === req.id}
                                  disabled={Boolean(cancellingRequestId)}
                                >
                                  Cancel Request
                                </Button>
                              )}
                            </div>
                          </Card>
                        </Reveal>
                      );
                    })}
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        )}

        {/* Confirm Action Dialog */}
        <ConfirmDialog
          isOpen={dialog.isOpen}
          title={dialog.type === "accept" ? "Join Roommate Group?" : "Decline Invitation?"}
          message={
            dialog.type === "accept"
              ? `You are about to join ${dialog.inv?.leaderName}'s ${dialog.inv?.targetSize}-bed room group. Any other pending invitations will be cancelled automatically.`
              : `Are you sure you want to decline this invitation from ${dialog.inv?.leaderName}?`
          }
          variant={dialog.type === "accept" ? "info" : "warning"}
          confirmText={dialog.type === "accept" ? "Yes, Join Group" : "Yes, Decline"}
          onConfirm={handleConfirm}
          onCancel={closeDialog}
        />

      </div>
    </PageTransition>
  );
}
