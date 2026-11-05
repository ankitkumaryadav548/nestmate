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
  CardFooter,
  Alert,
  Badge,
  Button,
  Modal,
  Pagination,
  EmptyState,
  ErrorState,
  Tabs,
  Avatar,
  ProgressBar,
  ScoreRing,
  PageTransition,
  Reveal,
  Skeleton,
  IconSparkles,
  IconUsers,
  IconBed,
  IconSliders,
  IconShield,
  IconCheck,
} from "@/components/ui";
import { getScoreTone, getScoreClasses } from "@/components/ui/ScoreTone";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function StudentMatchesPage() {
  useDocumentTitle("Roommate Matches");
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("students"); // "students" | "groups"
  const [loading, setLoading] = useState(true);
  const [matchesError, setMatchesError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [preferencesIncomplete, setPreferencesIncomplete] = useState(false);
  const [singleRoom, setSingleRoom] = useState(false);
  const [groupStatusBanner, setGroupStatusBanner] = useState(null);
  const [leaderGroup, setLeaderGroup] = useState(null);
  const [invitedUserIds, setInvitedUserIds] = useState(new Set());
  const [invitingId, setInvitingId] = useState(null);

  // Groups Tab State
  const [openGroups, setOpenGroups] = useState([]);
  const [groupsTotal, setGroupsTotal] = useState(0);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsTotalPages, setGroupsTotalPages] = useState(1);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalLoading, setGroupModalLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [sendingJoinRequest, setSendingJoinRequest] = useState(false);
  const [requestedGroupIds, setRequestedGroupIds] = useState(new Set());

  // Filters
  const [minScore, setMinScore] = useState(0);
  const [sameYearOnly, setSameYearOnly] = useState(false);
  const [sharedLanguageOnly, setSharedLanguageOnly] = useState(false);

  // Modal inspection for individual student
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchMatches = useCallback(
    async (currentPage = page) => {
      setLoading(true);
      setMatchesError(null);
      try {
        const res = await api.get("/matches/me", {
          params: {
            page: currentPage,
            limit: 12,
            minScore,
            sameYearOnly,
            sharedLanguageOnly,
          },
        });

        if (res.data?.success) {
          const data = res.data.data;
          setGroupStatusBanner(data.groupStatusBanner || null);
          setLeaderGroup(data.leaderGroup || null);
          setSingleRoom(Boolean(data.singleRoom));
          setMatches(data.matches || []);
          setTotal(data.total || 0);
          setPage(data.page || 1);
          setTotalPages(data.totalPages || 1);
          setPreferencesIncomplete(false);

          // Sync pending sent invitations if any
          try {
            const groupRes = await api.get("/groups/me");
            if (groupRes.data?.success && groupRes.data.data?.pendingInvitations) {
              const pendingIds = groupRes.data.data.pendingInvitations
                .map((inv) => inv.invitedUser?.id || inv.invitedUser?._id)
                .filter(Boolean);
              if (pendingIds.length > 0) {
                setInvitedUserIds((prev) => new Set([...prev, ...pendingIds]));
              }
            }
          } catch {
            // Not in group or no pending invites
          }
        }
      } catch (err) {
        if (err.response?.status === 409 || err.response?.data?.details?.code === "PREFERENCES_INCOMPLETE") {
          setPreferencesIncomplete(true);
        } else {
          console.error("Failed to load roommate matches:", err);
          setMatchesError(err.response?.data?.message || err.message || "Failed to load roommate matches. Please check your connection.");
        }
      } finally {
        setLoading(false);
      }
    },
    [page, minScore, sameYearOnly, sharedLanguageOnly]
  );

  const fetchOpenGroups = useCallback(
    async (currentPage = groupsPage) => {
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const res = await api.get("/groups/open", {
          params: {
            page: currentPage,
            limit: 12,
            minScore,
            sameYearOnly,
            sharedLanguageOnly,
          },
        });

        if (res.data?.success) {
          const data = res.data.data;
          const groups = data.groups || [];
          setOpenGroups(groups);
          setGroupsTotal(data.total || 0);
          setGroupsPage(data.page || 1);
          setGroupsTotalPages(data.totalPages || 1);

          const pendingIds = groups
            .filter((g) => g.userHasPendingRequest || g.requestStatus === "pending")
            .map((g) => g.id || g.groupId);
          if (pendingIds.length > 0) {
            setRequestedGroupIds((prev) => new Set([...prev, ...pendingIds]));
          }
        }
      } catch (err) {
        console.error("Failed to load open groups:", err);
        setGroupsError(err.response?.data?.message || err.message || "Failed to load open groups. Please check your connection.");
      } finally {
        setGroupsLoading(false);
      }
    },
    [groupsPage, minScore, sameYearOnly, sharedLanguageOnly]
  );

  const handleInviteToGroup = async (userId) => {
    if (!userId) {
      showToast("Candidate ID missing", "error");
      return;
    }
    setInvitingId(userId);
    try {
      const res = await api.post("/groups/me/invitations", { userId });
      if (res.data?.success) {
        setInvitedUserIds((prev) => new Set([...prev, userId]));
        showToast("Invitation sent to candidate!", "success");
        // Re-fetch matches to refresh leaderGroup state
        fetchMatches();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to send invitation", "error");
    } finally {
      setInvitingId(null);
    }
  };

  const handleOpenGroupModal = async (groupItem) => {
    const targetGroupId = groupItem.id || groupItem.groupId || groupItem._id;
    if (!targetGroupId) {
      showToast("Group ID missing", "error");
      return;
    }
    setIsGroupModalOpen(true);
    setGroupModalLoading(true);
    setJoinMessage("");
    try {
      const res = await api.get(`/groups/open/${targetGroupId}`);
      if (res.data?.success) {
        setSelectedGroup(res.data.data);
      } else {
        setSelectedGroup({ ...groupItem, id: targetGroupId, groupId: targetGroupId });
      }
    } catch (err) {
      console.error("Failed to load group details:", err);
      setSelectedGroup({ ...groupItem, id: targetGroupId, groupId: targetGroupId });
    } finally {
      setGroupModalLoading(false);
    }
  };

  const handleCloseGroupModal = () => {
    setSelectedGroup(null);
    setIsGroupModalOpen(false);
    setJoinMessage("");
  };

  const handleSendJoinRequest = async () => {
    if (!selectedGroup) return;
    const targetGroupId = selectedGroup.id || selectedGroup.groupId || selectedGroup._id;
    if (!targetGroupId) {
      showToast("Group ID missing", "error");
      return;
    }
    setSendingJoinRequest(true);
    try {
      const res = await api.post(`/groups/open/${targetGroupId}/join-requests`, {
        message: joinMessage.trim(),
      });
      if (res.data?.success) {
        setRequestedGroupIds((prev) => new Set([...prev, targetGroupId]));
        showToast("Join request sent to group leader!", "success");
        handleCloseGroupModal();
        fetchOpenGroups(groupsPage);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to send join request", "error");
    } finally {
      setSendingJoinRequest(false);
    }
  };

  useEffect(() => {
    if (activeTab === "students") {
      fetchMatches(1);
    } else {
      fetchOpenGroups(1);
    }
  }, [activeTab, minScore, sameYearOnly, sharedLanguageOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (newPage) => {
    if (activeTab === "students") {
      setPage(newPage);
      fetchMatches(newPage);
    } else {
      setGroupsPage(newPage);
      fetchOpenGroups(newPage);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenModal = (match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedMatch(null);
    setIsModalOpen(false);
  };

  // State: Preferences Not Completed
  if (preferencesIncomplete) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon="📋"
            title="Complete Your Preferences to Unlock Matches"
            description="Our roommate compatibility engine calculates mutual affinity based on your daily routine, sleep hours, noise tolerance, study habits, and living standards. Answer our questionnaire to explore your top matches and browse open groups."
            action={
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link href="/dashboard/preferences">
                  <Button variant="primary" size="md">
                    Start Lifestyle Questionnaire &rarr;
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary" size="md">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            }
          />
        </div>
      </PageTransition>
    );
  }

  // State: Single Room Selection
  if (singleRoom) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon="🛏️"
            title="Single Room Selected"
            description="You chose a single room (1 bed), so no roommate matching is needed. You will be allocated independently without roommates."
            action={
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link href="/dashboard/preferences">
                  <Button variant="primary" size="md">
                    Change Room Type Preference &rarr;
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary" size="md">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            }
          />
        </div>
      </PageTransition>
    );
  }

  // State: In Complete or Locked Group Banner
  if (groupStatusBanner) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon="🏠"
            title={
              groupStatusBanner.status === "complete"
                ? "Your Roommate Group is Complete"
                : groupStatusBanner.status === "locked"
                ? "Your Room Allocation is Finalized"
                : "Roommate Group Membership Active"
            }
            description={
              groupStatusBanner.status === "complete"
                ? `All ${groupStatusBanner.targetSize} seats in your group have been filled. You can review your room or group details.`
                : groupStatusBanner.status === "locked"
                ? "Your room assignment has been locked. Check your room assignment under My Room."
                : "You belong to a roommate group as a member. Prospective roommate invitations and group roster changes are managed by your group leader."
            }
            action={
              <Link href="/dashboard/group">
                <Button variant="primary" size="md">
                  View My Group &rarr;
                </Button>
              </Link>
            }
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <Reveal direction="down">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <IconSparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-heading">
                  Roommate Matching & Groups
                </h1>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Explore compatibility-ranked peers or discover forming groups looking for a roommate.
              </p>
            </div>

            {leaderGroup && (
              <Badge variant="brand" size="md">
                Group Leader ({leaderGroup.seatsFilled}/{leaderGroup.targetSize} beds filled)
              </Badge>
            )}
          </div>
        </Reveal>

        {/* Tabs: Students vs Open Groups */}
        <Reveal direction="up" delay={50}>
          <div className="border-b border-slate-200 dark:border-slate-800">
            <Tabs
              tabs={[
                { id: "students", label: `Compatible Students (${total})` },
                { id: "groups", label: `Open Groups to Join (${groupsTotal})` },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="underline"
            />
          </div>
        </Reveal>

        {/* Filter Bar Card */}
        <Reveal direction="up" delay={100}>
          <Card variant="default" className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Score Slider with Value Bubble */}
              <div className="flex items-center gap-3 flex-1 max-w-sm">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                  Min Score:
                </span>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <Badge variant={getScoreTone(minScore)} size="sm">
                  {minScore}%+
                </Badge>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-4 flex-wrap text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={sameYearOnly}
                    onChange={(e) => setSameYearOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Same Academic Year</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={sharedLanguageOnly}
                    onChange={(e) => setSharedLanguageOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Shared Language</span>
                </label>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* TAB 1: INDIVIDUAL STUDENTS */}
        {activeTab === "students" && (
          <div className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Card key={idx} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton variant="circular" width={48} height={48} />
                      <Skeleton variant="circular" width={44} height={44} />
                    </div>
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="80%" height={16} />
                    <Skeleton variant="rectangular" width="100%" height={36} />
                  </Card>
                ))}
              </div>
            ) : matchesError ? (
              <ErrorState
                title="Failed to Load Matching Students"
                message={matchesError}
                onRetry={() => fetchMatches(page)}
              />
            ) : matches.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No Matching Students Found"
                description="Try lowering the minimum score or adjusting your filters to see more roommate candidates."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMinScore(0);
                      setSameYearOnly(false);
                      setSharedLanguageOnly(false);
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {matches.map((match) => {
                    const candidateId = match.id || match.userId || match._id;
                    const score = match.score ?? match.compatibilityScore ?? 0;
                    const tone = getScoreTone(score);
                    const isInvited = invitedUserIds.has(candidateId);
                    const groupInfo = match.inGroup || match.groupInfo;
                    const isCandidateInMultiGroup = groupInfo && ((groupInfo.filledSeats || groupInfo.seatsFilled || 0) > 1);
                    const leaderHasFreeSeats = !leaderGroup || (leaderGroup.freeSeats > 0 || (leaderGroup.membersCount || 1) < leaderGroup.targetSize);
                    const canInvite = !singleRoom && leaderHasFreeSeats && !isCandidateInMultiGroup;

                    return (
                      <Card
                        key={candidateId}
                        variant="interactive"
                        className="p-5 flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Top: Avatar, Name & Score Ring */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar name={match.name} size="lg" />
                              <div className="min-w-0">
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading truncate">
                                  {match.name}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {[match.course, match.year ? `Year ${match.year}` : null].filter(Boolean).join(" • ")}
                                </p>
                              </div>
                            </div>

                            <ScoreRing score={score} size={48} strokeWidth={4} />
                          </div>

                          {/* Group Membership Pill */}
                          {groupInfo && (
                            <div className="mt-3">
                              <Badge variant="neutral" size="sm">
                                👥 In Group ({groupInfo.filledSeats || groupInfo.seatsFilled}/{groupInfo.targetSize} beds)
                              </Badge>
                            </div>
                          )}

                          {/* Reason Chips */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {match.reasons?.slice(0, 3).map((r, i) => (
                              <Badge key={i} variant="success" size="sm">
                                ✓ {r}
                              </Badge>
                            ))}
                            {match.warnings?.slice(0, 1).map((w, i) => (
                              <Badge key={i} variant="warning" size="sm">
                                ⚠️ {w}
                              </Badge>
                            ))}
                          </div>

                          {/* Shared Languages */}
                          {match.sharedLanguages?.length > 0 && (
                            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">Speaks:</span>
                              {match.sharedLanguages.map((l, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenModal(match)}
                          >
                            View Details
                          </Button>

                          {canInvite && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleInviteToGroup(candidateId)}
                              loading={invitingId === candidateId}
                              disabled={isInvited || invitingId === candidateId}
                            >
                              {isInvited ? "Invited ✓" : "+ Invite"}
                            </Button>
                          )}

                          {!canInvite && isCandidateInMultiGroup && groupInfo?.groupId && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenGroupModal({ id: groupInfo.groupId, groupId: groupInfo.groupId })}
                            >
                              Join Group &rarr;
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="pt-4 flex justify-center">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: OPEN GROUPS */}
        {activeTab === "groups" && (
          <div className="space-y-6">
            {groupsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Card key={idx} className="p-5 space-y-3">
                    <Skeleton variant="text" width="50%" height={20} />
                    <Skeleton variant="rectangular" width="100%" height={60} />
                    <Skeleton variant="rectangular" width="100%" height={36} />
                  </Card>
                ))}
              </div>
            ) : groupsError ? (
              <ErrorState
                title="Failed to Load Open Groups"
                message={groupsError}
                onRetry={() => fetchOpenGroups(groupsPage)}
              />
            ) : openGroups.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No Open Groups Currently Available"
                description="There are currently no forming groups seeking members with your matching room size. Check back soon or create your own group."
                action={
                  <Link href="/dashboard/group">
                    <Button variant="primary">Create a Group &rarr;</Button>
                  </Link>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {openGroups.map((group) => {
                    const grpId = group.id || group.groupId || group._id;
                    const avgScore = group.averageScoreWithUser ?? group.average ?? 0;
                    const isRequested = requestedGroupIds.has(grpId) || group.requestStatus === "pending" || group.userHasPendingRequest;
                    const leaderDisplayName = group.leaderName || group.members?.[0]?.name || "Group";
                    const seatsFilled = group.seatsFilled ?? group.filledSeats ?? (group.members?.length || 1);
                    const targetSize = group.targetSize || 2;
                    const roomInfo = group.claimedRoom || group.room;
                    const canReq = group.canRequest !== false && !isRequested;

                    return (
                      <Card
                        key={grpId}
                        variant="interactive"
                        className="p-5 flex flex-col justify-between"
                      >
                        <div>
                          {/* Group Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                                {leaderDisplayName}&apos;s Group
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {targetSize}-Bed Room Group
                              </p>
                            </div>
                            <ScoreRing score={avgScore} size={48} strokeWidth={4} />
                          </div>

                          {/* Member Avatars & Seat Dots */}
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center -space-x-2">
                              {group.members?.map((m, idx) => (
                                <Avatar
                                  key={idx}
                                  name={m.name}
                                  size="md"
                                  className="ring-2 ring-white dark:ring-slate-900"
                                />
                              ))}
                            </div>

                            {/* Seat dots */}
                            <div className="flex items-center gap-1.5">
                              {Array.from({ length: targetSize }).map((_, idx) => (
                                <span
                                  key={idx}
                                  className={`w-3 h-3 rounded-full border ${
                                    idx < seatsFilled
                                      ? "bg-teal-500 border-teal-600"
                                      : "bg-slate-200 dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-700"
                                  }`}
                                  title={idx < seatsFilled ? "Filled seat" : "Open seat"}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Claimed Room Line */}
                          {roomInfo && (
                            <div className="mt-3.5 p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                              <IconBed className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span className="truncate">
                                Room #{roomInfo.roomNumber} ({roomInfo.hostelName})
                              </span>
                            </div>
                          )}

                          {/* Per-member compatibility pills */}
                          {group.perMemberScores?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {group.perMemberScores.map((p, idx) => (
                                <Badge key={idx} variant={getScoreTone(p.score)} size="sm">
                                  {p.memberName?.split(" ")[0]}: {p.score}%
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenGroupModal(group)}
                          >
                            View Details
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenGroupModal(group)}
                            disabled={isRequested}
                          >
                            {isRequested ? "Requested ⏳" : "Request to Join &rarr;"}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {groupsTotalPages > 1 && (
                  <div className="pt-4 flex justify-center">
                    <Pagination
                      currentPage={groupsPage}
                      totalPages={groupsTotalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Modal 1: Student Match Details */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={selectedMatch ? `${selectedMatch.name}'s Compatibility Profile` : "Match Details"}
          size="lg"
        >
          {selectedMatch && (() => {
            const selCandidateId = selectedMatch.id || selectedMatch.userId || selectedMatch._id;
            const selScore = selectedMatch.score ?? selectedMatch.compatibilityScore ?? 0;
            const selGroupInfo = selectedMatch.inGroup || selectedMatch.groupInfo;
            const selInMultiGroup = selGroupInfo && ((selGroupInfo.filledSeats || selGroupInfo.seatsFilled || 0) > 1);
            const leaderHasFreeSeats = !leaderGroup || (leaderGroup.freeSeats > 0 || (leaderGroup.membersCount || 1) < leaderGroup.targetSize);
            const selCanInvite = !singleRoom && leaderHasFreeSeats && !selInMultiGroup;
            const isSelInvited = invitedUserIds.has(selCandidateId);

            const breakdownItems = Array.isArray(selectedMatch.breakdown)
              ? selectedMatch.breakdown.map((b) => ({
                  key: b.key || b.label,
                  label: b.label || b.key,
                  score: b.percent ?? (b.similarity != null ? Math.round(b.similarity * 100) : b.points ?? 0),
                }))
              : typeof selectedMatch.breakdown === "object" && selectedMatch.breakdown !== null
              ? Object.entries(selectedMatch.breakdown).map(([k, v]) => ({
                  key: k,
                  label: k.replace(/([A-Z])/g, " $1"),
                  score: typeof v === "number" ? v : v?.percent ?? 0,
                }))
              : [];

            return (
              <div className="space-y-6">
                {/* Modal Hero */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center gap-3.5">
                    <Avatar name={selectedMatch.name} size="xl" />
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                        {selectedMatch.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {[selectedMatch.course, selectedMatch.year ? `Year ${selectedMatch.year}` : null].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <ScoreRing score={selScore} size={56} strokeWidth={5} />
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block mt-1">
                      Overall Match
                    </span>
                  </div>
                </div>

                {/* Category Breakdown Bars */}
                {breakdownItems.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Category Breakdown
                    </h4>
                    <div className="space-y-2.5">
                      {breakdownItems.map((item, i) => (
                        <div key={item.key || i} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="capitalize text-slate-700 dark:text-slate-300">
                              {item.label}
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {item.score}%
                            </span>
                          </div>
                          <ProgressBar value={item.score} max={100} color="brand" animated />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reasons & Strengths */}
                {selectedMatch.reasons?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                      Key Harmonious Strengths
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {selectedMatch.reasons.map((r, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-teal-600">✓</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Differences */}
                {selectedMatch.warnings?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Soft Routine Differences
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {selectedMatch.warnings.map((w, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-amber-600">⚠️</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Privacy Footer & Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <IconShield className="w-3.5 h-3.5 text-slate-400" />
                    Raw answers and contact details are kept strictly private until room assignment.
                  </div>

                  {selCanInvite && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleInviteToGroup(selCandidateId)}
                      loading={invitingId === selCandidateId}
                      disabled={isSelInvited || invitingId === selCandidateId}
                    >
                      {isSelInvited ? "Invited ✓" : "+ Invite to Group"}
                    </Button>
                  )}

                  {!selCanInvite && selIsCandidateInMultiGroup && selGroupInfo?.groupId && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedMatch(null);
                        setIsModalOpen(false);
                        handleOpenGroupModal({ id: selGroupInfo.groupId, groupId: selGroupInfo.groupId });
                      }}
                    >
                      Request to Join Group &rarr;
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>

        {/* Modal 2: Group Details & Join Request */}
        <Modal
          isOpen={isGroupModalOpen}
          onClose={handleCloseGroupModal}
          title={selectedGroup ? `${selectedGroup.leaderName || "Group"}'s Group Details` : "Group Details"}
          size="lg"
        >
          {groupModalLoading ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-3">
              <Spinner size="lg" />
              <p className="text-xs text-slate-500">Loading group details...</p>
            </div>
          ) : selectedGroup && (() => {
            const grpId = selectedGroup.id || selectedGroup.groupId || selectedGroup._id;
            const avgScore = selectedGroup.averageScoreWithUser ?? selectedGroup.average ?? 0;
            const seatsFilled = selectedGroup.seatsFilled ?? selectedGroup.filledSeats ?? (selectedGroup.members?.length || 1);
            const targetSize = selectedGroup.targetSize || 2;
            const leaderName = selectedGroup.leaderName || selectedGroup.members?.[0]?.name || "Group Leader";
            const isRequested = requestedGroupIds.has(grpId) || selectedGroup.requestStatus === "pending" || selectedGroup.userHasPendingRequest;
            const canReq = selectedGroup.canRequest !== false && !isRequested;

            return (
              <div className="space-y-6">
                {/* Group Hero */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                      {leaderName}&apos;s Group
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {targetSize}-Bed Room • {seatsFilled} of {targetSize} seats filled
                    </p>
                  </div>
                  <ScoreRing score={avgScore} size={56} strokeWidth={5} />
                </div>

                {/* Status Notice if already requested or cannot request */}
                {isRequested && (
                  <Alert variant="info" title="Request Pending">
                    You have already sent a join request to this group. The group leader will review your request and decide whether to approve it.
                  </Alert>
                )}

                {!isRequested && !canReq && selectedGroup.canRequestReason && (
                  <Alert variant="warning" title="Cannot Join Group">
                    {selectedGroup.canRequestReason}
                  </Alert>
                )}

                {/* Impact Preview */}
                {selectedGroup.impact && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Group Compatibility Impact
                    </span>
                    <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                      <div>
                        Current Average: <strong className="text-slate-900 dark:text-slate-100">{selectedGroup.impact.beforeScore}%</strong>
                      </div>
                      <div>&rarr;</div>
                      <div>
                        Projected After Join: <strong className="text-teal-600 dark:text-teal-400">{selectedGroup.impact.afterScore}%</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Members List */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Current Roommates
                  </h4>
                  <div className="space-y-2">
                    {selectedGroup.members?.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} size="sm" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {m.name} {m.isLeader && "👑 (Leader)"}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {[m.course, m.year ? `Year ${m.year}` : null].filter(Boolean).join(" • ")}
                            </p>
                          </div>
                        </div>

                        {m.scoreWithUser !== undefined && (
                          <Badge variant={getScoreTone(m.scoreWithUser)} size="sm">
                            {m.scoreWithUser}% Match
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Join Request Message Box */}
                {canReq && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Optional Note to Leader
                    </label>
                    <textarea
                      value={joinMessage}
                      onChange={(e) => setJoinMessage(e.target.value.slice(0, 200))}
                      placeholder="Introduce yourself or mention why you'd like to join this group..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Leader will review your compatibility before approving.</span>
                      <span>{joinMessage.length}/200</span>
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <Button variant="secondary" onClick={handleCloseGroupModal}>
                    {canReq ? "Cancel" : "Close"}
                  </Button>
                  {canReq && (
                    <Button
                      variant="primary"
                      onClick={handleSendJoinRequest}
                      loading={sendingJoinRequest}
                      disabled={sendingJoinRequest}
                    >
                      Send Join Request &rarr;
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>

      </div>
    </PageTransition>
  );
}
