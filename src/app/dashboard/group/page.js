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
  Modal,
  ConfirmDialog,
  Alert,
  EmptyState,
  ErrorState,
  SeatTile,
  ScoreRing,
  Avatar,
  ProgressBar,
  PageTransition,
  Reveal,
  CountdownBadge,
  IconUsers,
  IconBed,
  IconShield,
  IconSparkles,
  IconCheck,
} from "@/components/ui";
import { getScoreTone, getScoreClasses } from "@/components/ui/ScoreTone";
import RoomPreferencesCard from "@/components/groups/RoomPreferencesCard";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function StudentGroupPage() {
  useDocumentTitle("My Roommate Group");
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [groupError, setGroupError] = useState(null);
  const [group, setGroup] = useState(null);
  const [intent, setIntent] = useState({ mode: "group", preferredRoomSize: 2 });
  const [preferencesIncomplete, setPreferencesIncomplete] = useState(false);
  const [userRoomSize, setUserRoomSize] = useState(null);

  // Group creation state
  const [creating, setCreating] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  // Candidates for leader
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState(null);
  const [candidateFilters, setCandidateFilters] = useState({
    minScore: 0,
    sameYearOnly: false,
    sharedLanguageOnly: false,
  });
  const [invitingId, setInvitingId] = useState(null);

  // Incoming join requests for leader
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actingRequestId, setActingRequestId] = useState(null);

  // Modals & Confirm Dialogs
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    action: null,
    variant: "warning",
  });

  const fetchGroupData = useCallback(async () => {
    setLoading(true);
    setGroupError(null);
    try {
      const [groupRes, intentRes, statusRes, prefRes] = await Promise.all([
        api.get("/groups/me").catch(() => ({ data: { data: null } })),
        api.get("/students/me/intent").catch(() => ({ data: { data: null } })),
        api.get("/students/me/status").catch(() => ({ data: { data: null } })),
        api.get("/students/me/preferences").catch(() => ({ data: { data: null } })),
      ]);

      if (statusRes.data?.data && !statusRes.data.data.preferencesCompleted) {
        setPreferencesIncomplete(true);
      } else {
        setPreferencesIncomplete(false);
      }

      const pref = prefRes.data?.data;
      if (pref?.roomSize) {
        setUserRoomSize(pref.roomSize);
      }

      setGroup(groupRes.data?.data || null);
      if (intentRes.data?.data) {
        setIntent(intentRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load group data:", err);
      setGroupError(err.response?.data?.message || err.message || "Failed to load group information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCandidates = useCallback(async () => {
    if (!group || group.myRole !== "leader" || group.status !== "forming") return;
    setCandidatesLoading(true);
    setCandidatesError(null);
    try {
      const res = await api.get("/groups/me/candidates", {
        params: {
          minScore: candidateFilters.minScore,
          sameYearOnly: candidateFilters.sameYearOnly,
          sharedLanguageOnly: candidateFilters.sharedLanguageOnly,
        },
      });
      if (res.data?.success) {
        setCandidates(res.data.data?.candidates || []);
      }
    } catch (err) {
      console.error("Failed to fetch group candidates:", err);
      setCandidatesError(err.response?.data?.message || err.message || "Failed to load candidate matches.");
    } finally {
      setCandidatesLoading(false);
    }
  }, [group, candidateFilters]);

  const fetchIncomingRequests = useCallback(async () => {
    if (!group || group.myRole !== "leader" || group.status !== "forming") return;
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const res = await api.get("/groups/me/join-requests");
      if (res.data?.success) {
        setIncomingRequests(res.data.data?.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch incoming join requests:", err);
      setRequestsError(err.response?.data?.message || err.message || "Failed to load incoming join requests.");
    } finally {
      setRequestsLoading(false);
    }
  }, [group]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  useEffect(() => {
    if (group && group.myRole === "leader" && group.status === "forming") {
      fetchCandidates();
      fetchIncomingRequests();
    }
  }, [group, fetchCandidates, fetchIncomingRequests]);

  const handleOpenReview = async (requestId) => {
    setSelectedRequestId(requestId);
    setIsReviewOpen(true);
    setReviewLoading(true);
    try {
      const res = await api.get(`/groups/me/join-requests/${requestId}`);
      if (res.data?.success) {
        setReviewData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load request review:", err);
      showToast(err.response?.data?.message || "Failed to load request review", "error");
      setIsReviewOpen(false);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequestId) return;
    setActingRequestId(selectedRequestId);
    try {
      const res = await api.post(`/groups/me/join-requests/${selectedRequestId}/approve`);
      if (res.data?.success) {
        showToast("Student admitted to group successfully!", "success");
        setIsReviewOpen(false);
        setSelectedRequestId(null);
        setReviewData(null);
        await fetchGroupData();
        fetchIncomingRequests();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to approve join request", "error");
    } finally {
      setActingRequestId(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequestId) return;
    setActingRequestId(selectedRequestId);
    try {
      const res = await api.post(`/groups/me/join-requests/${selectedRequestId}/reject`);
      if (res.data?.success) {
        showToast("Join request declined.", "info");
        setIsReviewOpen(false);
        setSelectedRequestId(null);
        setReviewData(null);
        fetchIncomingRequests();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to decline join request", "error");
    } finally {
      setActingRequestId(null);
    }
  };

  const handleCreateGroup = async () => {
    setCreating(true);
    try {
      const res = await api.post("/groups");
      if (res.data?.success) {
        showToast(`Formed a ${userRoomSize || ""}-bed roommate group!`, "success");
        await fetchGroupData();
        fetchIncomingRequests();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create group", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleSendInvite = async (userId) => {
    setInvitingId(userId);
    try {
      const res = await api.post("/groups/me/invitations", { userId });
      if (res.data?.success) {
        showToast("Invitation sent successfully!", "success");
        await fetchGroupData();
        await fetchCandidates();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send invitation", "error");
    } finally {
      setInvitingId(null);
    }
  };

  const handleCancelInvite = async (invitationId) => {
    try {
      const res = await api.delete(`/groups/me/invitations/${invitationId}`);
      if (res.data?.success) {
        showToast("Invitation cancelled", "info");
        await fetchGroupData();
        await fetchCandidates();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel invitation", "error");
    }
  };

  const handleLeaveGroup = async () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    try {
      const res = await api.post("/groups/me/leave");
      if (res.data?.success) {
        showToast("You have left the roommate group", "info");
        await fetchGroupData();
        fetchIncomingRequests();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to leave group", "error");
    }
  };

  const handleRemoveMember = async (memberId) => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    try {
      const res = await api.post(`/groups/me/members/${memberId}/remove`);
      if (res.data?.success) {
        showToast("Member removed from group", "info");
        await fetchGroupData();
        await fetchCandidates();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to remove member", "error");
    }
  };

  const handleDisbandGroup = async () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    try {
      const res = await api.delete("/groups/me");
      if (res.data?.success) {
        showToast("Group disbanded", "info");
        await fetchGroupData();
        fetchIncomingRequests();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to disband group", "error");
    }
  };

  const handleSaveIntent = async (mode, preferredRoomSize) => {
    try {
      const res = await api.put("/students/me/intent", { mode, preferredRoomSize });
      if (res.data?.success) {
        setIntent(res.data.data);
        showToast("Allocation preferences saved!", "success");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update allocation preference", "error");
    }
  };

  // State: Preferences incomplete
  if (preferencesIncomplete) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon="📋"
            title="Complete Questionnaire to Access Groups"
            description="Roommate groups require completed lifestyle answers to evaluate mutual compatibility and prevent room conflicts."
            action={
              <Link href="/dashboard/preferences">
                <Button variant="primary" size="md">
                  Start 5-Step Questionnaire &rarr;
                </Button>
              </Link>
            }
          />
        </div>
      </PageTransition>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-10 px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
      </div>
    );
  }

  // STATE 1: NO ACTIVE GROUP
  if (!group) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-7xl py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-8">
          <Reveal direction="down">
            <div>
              <div className="flex items-center gap-2.5">
                <IconUsers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-heading">
                  Roommate Group Formation
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Form a residential group to reserve a room with your preferred roommates, or choose automatic placement.
              </p>
            </div>
          </Reveal>

          {groupError && (
            <Alert
              variant="danger"
              action={
                <Button variant="outline" size="sm" onClick={fetchGroupData}>
                  Try again
                </Button>
              }
            >
              {groupError}
            </Alert>
          )}

          {/* Single Room Notice or Option 1 */}
          {userRoomSize === 1 ? (
            <Reveal direction="up" delay={50}>
              <EmptyState
                icon="🛏️"
                title="Single-Room Selection (No Roommates Needed)"
                description="You chose a single room (1 bed) in your lifestyle questionnaire. Single-room students live independently and do not need roommates or a roommate group. You will be placed into a single room directly during the hostel allocation process."
                action={
                  <Link href="/dashboard/preferences">
                    <Button variant="secondary" size="sm">
                      Change Room Size in Preferences &rarr;
                    </Button>
                  </Link>
                }
              />
            </Reveal>
          ) : (
            <Reveal direction="up" delay={50}>
              <Card variant="interactive" className="p-6 sm:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
                      Option 1: Form a Roommate Group
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Your room type:</span>
                      <Badge variant="brand" size="md">
                        {userRoomSize ? `${userRoomSize}-seater (${userRoomSize}-Bed Room)` : "Shared Room"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Change it in your preferences (only possible when you are not in a group)
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    loading={creating}
                    onClick={handleCreateGroup}
                  >
                    Create My Group &rarr;
                  </Button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Create a {userRoomSize || "shared"}-seater roommate group. As leader, you will be able to search and invite compatible candidates who also chose a {userRoomSize || "matching"}-bed room.
                </p>
              </Card>
            </Reveal>
          )}

          {/* Option 2: Prefer Auto-Placement */}
          <Reveal direction="up" delay={100}>
            <Card variant="default" className="p-6 sm:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-2">
                    <span>🤖</span> Option 2: Prefer Automatic Placement?
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                    If you do not wish to build a custom roommate group, you can opt into the institutional
                    auto-placement pool. Our automated allocation solver will place you with compatible peers based on your questionnaire answers.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Badge variant="neutral" size="md">
                    Room Size: {userRoomSize || intent.preferredRoomSize || 2}-Bed Room
                  </Badge>

                  <Button
                    variant={intent.mode === "auto" ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleSaveIntent("auto", userRoomSize || intent.preferredRoomSize || 2)}
                  >
                    {intent.mode === "auto" ? "✓ Auto-Assign Selected" : "Choose Auto-Assign"}
                  </Button>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </PageTransition>
    );
  }

  // ACTIVE GROUP VIEW
  const avgTone = getScoreTone(group.averageScore);
  const lowTone = getScoreTone(group.lowestPairScore);

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Header */}
        <Reveal direction="down">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-heading">
                  My Roommate Group
                </h1>
                <Badge
                  variant={
                    group.status === "complete"
                      ? "success"
                      : group.status === "locked"
                      ? "brand"
                      : "info"
                  }
                  size="md"
                >
                  {group.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Targeting a <strong>{group.targetSize}-Bed Room</strong> ({group.gender.toUpperCase()} pool)
              </p>
            </div>

            {/* Action Controls */}
            <div className="flex items-center gap-2">
              {group.status !== "locked" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      title: "Leave Group",
                      message:
                        group.myRole === "leader"
                          ? "As leader, leaving this group will transfer leadership to the next earliest joined member, or disband if you are the sole member. Confirm leave?"
                          : "Are you sure you want to leave this roommate group?",
                      action: handleLeaveGroup,
                      variant: "warning",
                    })
                  }
                >
                  Leave Group
                </Button>
              )}

              {group.myRole === "leader" && group.status !== "locked" && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      title: "Disband Group",
                      message:
                        "Are you sure you want to dissolve this roommate group? All members will be removed and pending invitations will be cancelled.",
                      action: handleDisbandGroup,
                      variant: "danger",
                    })
                  }
                >
                  Disband Group
                </Button>
              )}
            </div>
          </div>
        </Reveal>

        {/* Selected Room Banner (FCFS claimed) */}
        {group.selectedRoom && (
          <Reveal direction="up" delay={50}>
            <Alert
              variant="success"
              title={`Reserved For Your Group: Room #${group.selectedRoom.roomNumber}`}
              action={
                <Link href="/dashboard/rooms">
                  <Button variant="success" size="sm">
                    Room Details &rarr;
                  </Button>
                </Link>
              }
            >
              {group.selectedRoom.hostelName} ({group.selectedRoom.hostelCode}) • Floor {group.selectedRoom.floor} • {group.selectedRoom.roomType} ({group.selectedRoom.capacity}-seater). Remaining seats stay reserved for your group.
            </Alert>
          </Reveal>
        )}

        {/* Room Selection Window Prompt for Leader */}
        {!group.selectedRoom && group.myRole === "leader" && group.status !== "locked" && (
          <Reveal direction="up" delay={50}>
            <Alert
              variant="brand"
              title="Room Selection Window"
              action={
                <Link href="/dashboard/rooms">
                  <Button variant="primary" size="sm">
                    Choose a Room &rarr;
                  </Button>
                </Link>
              }
            >
              As the leader, you can pick a free room directly during the open selection window on a first-come, first-served basis.
            </Alert>
          </Reveal>
        )}

        {/* Complete Group Banner */}
        {group.status === "complete" && (
          <Reveal direction="up" delay={50}>
            <Alert variant="success" title="Your Group is Complete!">
              All {group.targetSize} seats have been filled with compatible roommates. Your group is ready for hostel block allocation.
            </Alert>
          </Reveal>
        )}

        {/* HERO: Seat Visualisation Cards */}
        <Reveal direction="up" delay={100}>
          <Card variant="elevated" className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                  Room Seats & Members
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {group.seatsFilled} of {group.targetSize} seats reserved ({group.seatsRemaining} remaining)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="brand" size="md">
                  {group.targetSize}-Bed Room ({group.targetSize}-seater)
                </Badge>
              </div>
            </div>

            {/* Seat Tiles Row / Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: group.targetSize }).map((_, index) => {
                const member = group.members[index];
                return (
                  <SeatTile
                    key={index}
                    seatNumber={index + 1}
                    member={member}
                    isLeader={member?.isLeader}
                    isReserved={Boolean(group.selectedRoom && !member)}
                    onInvite={
                      !member && group.myRole === "leader" && group.status === "forming"
                        ? () => {
                            const el = document.getElementById("recommended-candidates");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }
                        : undefined
                    }
                  />
                );
              })}
            </div>

            {/* Group Scores Metrics */}
            {group.members.length > 1 && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Group Average Compatibility
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-500">
                      Calculated across all member pairs
                    </span>
                  </div>
                  <ScoreRing score={group.averageScore} size={52} strokeWidth={5} />
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Lowest Pair Score
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-500">
                      Weakest link compatibility
                    </span>
                  </div>
                  <ScoreRing score={group.lowestPairScore} size={52} strokeWidth={5} />
                </div>
              </div>
            )}

            {/* Pairwise Match Ratings */}
            {group.pairScores?.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pairwise Match Ratings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {group.pairScores.map((pair, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate mr-2">
                        {pair.memberA} ↔ {pair.memberB}
                      </span>
                      <Badge variant={getScoreTone(pair.score)} size="sm">
                        {pair.score}% {pair.label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Reveal>

        {/* Incoming Join Requests (Leader Review) */}
        {group.myRole === "leader" && group.status === "forming" && (
          <Reveal direction="up" delay={150}>
            <Card variant="default" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                    Incoming Join Requests
                  </h3>
                  <Badge variant={incomingRequests.length > 0 ? "warning" : "neutral"} size="sm" pulse={incomingRequests.length > 0}>
                    {incomingRequests.length} pending
                  </Badge>
                </div>
              </div>

              {requestsLoading ? (
                <div className="h-24 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 animate-pulse" />
              ) : requestsError ? (
                <div className="p-2 space-y-2">
                  <Alert variant="danger">{requestsError}</Alert>
                  <Button variant="outline" size="sm" onClick={fetchIncomingRequests}>
                    Try again
                  </Button>
                </div>
              ) : incomingRequests.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                  No students have requested to join your group yet. Compatible students browsing open groups will appear here.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                            {req.requester?.name}
                          </h4>
                          <Badge variant={getScoreTone(req.scoreSnapshot?.average)} size="sm">
                            {req.scoreSnapshot?.average}% Match
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {req.requester?.course} {req.requester?.year ? `• Year ${req.requester.year}` : ""}
                        </p>
                        {req.message && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 mt-1 max-w-xl">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                        <CountdownBadge targetDate={req.expiresAt} prefix="⏳ " />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenReview(req.id)}
                        >
                          Review &amp; Decide &rarr;
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Reveal>
        )}

        {/* Pending Invitations Sent by Leader */}
        {group.myRole === "leader" && group.pendingInvitations?.length > 0 && (
          <Reveal direction="up" delay={200}>
            <Card variant="default" className="p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                Pending Sent Invitations ({group.pendingInvitations.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                {group.pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                        {inv.invitedUser?.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {inv.invitedUser?.course} • Year {inv.invitedUser?.year}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          Fit: Avg <strong>{inv.scoreSnapshot?.average}%</strong>
                        </span>
                        <CountdownBadge targetDate={inv.expiresAt} prefix="Expires in " />
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelInvite(inv.id)}
                    >
                      Cancel Invitation
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        )}

        {/* Room Preferences Config */}
        <Reveal direction="up" delay={250}>
          <RoomPreferencesCard
            isLeader={group.myRole === "leader"}
            isLocked={group.status === "locked"}
            targetSize={group.targetSize}
            onPreferencesUpdated={fetchGroupData}
          />
        </Reveal>

        {/* Leader's Candidate Discovery Section */}
        {group.myRole === "leader" && group.status === "forming" && group.seatsRemaining > 0 && (
          <div id="recommended-candidates">
            <Reveal direction="up" delay={300}>
              <Card variant="default" className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                      Recommended Candidates ({candidates.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Students compatible with all existing group members, ranked by overall group fit.
                    </p>
                  </div>

                  {/* Candidate Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCandidateFilters((prev) => ({ ...prev, sameYearOnly: !prev.sameYearOnly }))
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                        candidateFilters.sameYearOnly
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      🎓 Same Year Only
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCandidateFilters((prev) => ({
                          ...prev,
                          sharedLanguageOnly: !prev.sharedLanguageOnly,
                        }))
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                        candidateFilters.sharedLanguageOnly
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      🗣️ Shares Language
                    </button>
                  </div>
                </div>

                {candidatesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 animate-pulse" />
                    ))}
                  </div>
                ) : candidatesError ? (
                  <div className="p-2 space-y-2">
                    <Alert variant="danger">{candidatesError}</Alert>
                    <Button variant="outline" size="sm" onClick={fetchCandidates}>
                      Try again
                    </Button>
                  </div>
                ) : candidates.length === 0 ? (
                  <EmptyState
                    icon="🔍"
                    title="No Candidates Found"
                    description="No students currently match your group criteria or filter settings."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {candidates.map((cand) => {
                      const candidateUser = cand.candidate || cand;
                      const candidateId = candidateUser.id || candidateUser._id || cand.userId || cand.id;
                      const candidateName = candidateUser.name || cand.name;
                      const candidateCourse = candidateUser.course || cand.course;
                      const candidateYear = candidateUser.year || cand.year;
                      const fitScore = cand.groupAverage ?? cand.groupFitScore ?? 0;

                      return (
                        <Card
                          key={candidateId}
                          variant="interactive"
                          className="p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={candidateName} size="md" />
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading truncate">
                                    {candidateName}
                                  </h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {[candidateCourse, candidateYear ? `Year ${candidateYear}` : null].filter(Boolean).join(" • ")}
                                  </p>
                                </div>
                              </div>
                              <ScoreRing score={fitScore} size={42} strokeWidth={4} />
                            </div>

                            {cand.reasons?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {cand.reasons.slice(0, 2).map((r, i) => (
                                  <Badge key={i} variant="success" size="sm">
                                    ✓ {r}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <Button
                              variant="primary"
                              size="sm"
                              loading={invitingId === candidateId}
                              disabled={invitingId === candidateId}
                              onClick={() => handleSendInvite(candidateId)}
                            >
                              + Invite to Group
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
            </Reveal>
          </div>
        )}

        {/* Review Join Request Modal */}
        <Modal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          title="Review Join Request"
          size="lg"
        >
          {reviewLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading candidate profile...</div>
          ) : reviewData ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-3">
                  <Avatar name={reviewData.requester?.name} size="lg" />
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                      {reviewData.requester?.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {[reviewData.requester?.course, reviewData.requester?.year ? `Year ${reviewData.requester.year}` : null].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                </div>
                <ScoreRing score={reviewData.scoreSnapshot?.average} size={52} strokeWidth={5} />
              </div>

              {reviewData.message && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Applicant Note:</span>
                  <p className="text-slate-600 dark:text-slate-400 italic">&ldquo;{reviewData.message}&rdquo;</p>
                </div>
              )}

              {/* Impact */}
              {reviewData.impact && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Current Group Average</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">{reviewData.impact.beforeScore}%</strong>
                  </div>
                  <span className="text-indigo-600 font-bold">&rarr;</span>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">After Admitting</span>
                    <strong className="text-sm font-bold text-teal-600 dark:text-teal-400">{reviewData.impact.afterScore}%</strong>
                  </div>
                </div>
              )}

              {/* Per-member compatibility */}
              {reviewData.perMemberScores?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pairwise Compatibility with Group Members
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {reviewData.perMemberScores.map((p, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{p.memberName}</span>
                        <Badge variant={getScoreTone(p.score)} size="sm">{p.score}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={handleRejectRequest}
                  loading={actingRequestId === selectedRequestId}
                  disabled={Boolean(actingRequestId)}
                >
                  Decline Request
                </Button>
                <Button
                  variant="success"
                  onClick={handleApproveRequest}
                  loading={actingRequestId === selectedRequestId}
                  disabled={Boolean(actingRequestId)}
                >
                  ✓ Approve & Admit to Group
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* Global Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.action}
          onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        />

      </div>
    </PageTransition>
  );
}
