"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import { GROUP_SIZE_OPTIONS } from "@/config/groups";
import RoomPreferencesCard from "@/components/groups/RoomPreferencesCard";

export default function StudentGroupPage() {
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [intent, setIntent] = useState({ mode: "group", preferredRoomSize: 2 });
  const [preferencesIncomplete, setPreferencesIncomplete] = useState(false);

  // Group creation state
  const [creatingSize, setCreatingSize] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  // Candidates for leader
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateFilters, setCandidateFilters] = useState({
    minScore: 0,
    sameYearOnly: false,
    sharedLanguageOnly: false,
  });
  const [invitingId, setInvitingId] = useState(null);

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
    try {
      const [groupRes, intentRes, statusRes] = await Promise.all([
        api.get("/groups/me").catch(() => ({ data: { data: null } })),
        api.get("/students/me/intent").catch(() => ({ data: { data: null } })),
        api.get("/students/me/status").catch(() => ({ data: { data: null } })),
      ]);

      if (statusRes.data?.data && !statusRes.data.data.preferencesCompleted) {
        setPreferencesIncomplete(true);
      } else {
        setPreferencesIncomplete(false);
      }

      setGroup(groupRes.data?.data || null);
      if (intentRes.data?.data) {
        setIntent(intentRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load group data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCandidates = useCallback(async () => {
    if (!group || group.myRole !== "leader" || group.status !== "forming") return;
    setCandidatesLoading(true);
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
    } finally {
      setCandidatesLoading(false);
    }
  }, [group, candidateFilters]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  useEffect(() => {
    if (group && group.myRole === "leader" && group.status === "forming") {
      fetchCandidates();
    }
  }, [group, fetchCandidates]);

  // Actions
  const handleCreateGroup = async (size) => {
    setCreatingSize(size);
    setAlertMessage(null);
    try {
      const res = await api.post("/groups", { targetSize: size });
      if (res.data?.success) {
        setAlertMessage({ type: "success", message: `Formed a ${size}-bed roommate group!` });
        await fetchGroupData();
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Failed to create group",
      });
    } finally {
      setCreatingSize(null);
    }
  };

  const handleUpdateTargetSize = async (newSize) => {
    try {
      const res = await api.patch("/groups/me", { targetSize: newSize });
      if (res.data?.success) {
        setAlertMessage({ type: "success", message: `Updated target room size to ${newSize} beds` });
        await fetchGroupData();
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Failed to update room size",
      });
    }
  };

  const handleSendInvite = async (userId) => {
    setInvitingId(userId);
    setAlertMessage(null);
    try {
      const res = await api.post("/groups/me/invitations", { userId });
      if (res.data?.success) {
        setAlertMessage({ type: "success", message: "Invitation sent successfully!" });
        await fetchGroupData();
        await fetchCandidates();
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Failed to send invitation",
      });
    } finally {
      setInvitingId(null);
    }
  };

  const handleCancelInvite = async (invitationId) => {
    try {
      const res = await api.delete(`/groups/me/invitations/${invitationId}`);
      if (res.data?.success) {
        setAlertMessage({ type: "info", message: "Invitation cancelled" });
        await fetchGroupData();
        await fetchCandidates();
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Failed to cancel invitation",
      });
    }
  };

  const handleLeaveGroup = async () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    try {
      const res = await api.post("/groups/me/leave");
      if (res.data?.success) {
        setAlertMessage({ type: "info", message: "You have left the roommate group" });
        await fetchGroupData();
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Failed to leave group",
      });
    }
  };

  const handleRemoveMember = async (memberId) => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    try {
      const res = await api.post(`/groups/me/members/${memberId}/remove`);
      if (res.data?.success) {
        setAlertMessage({ type: "info", message: "Member removed from group" });
        await fetchGroupData();
        await fetchCandidates();
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Failed to remove member",
      });
    }
  };

  const handleDisbandGroup = async () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    try {
      const res = await api.delete("/groups/me");
      if (res.data?.success) {
        setAlertMessage({ type: "info", message: "Group disbanded" });
        await fetchGroupData();
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Failed to disband group",
      });
    }
  };

  const handleSaveIntent = async (mode, preferredRoomSize) => {
    try {
      const res = await api.put("/students/me/intent", { mode, preferredRoomSize });
      if (res.data?.success) {
        setIntent(res.data.data);
        setAlertMessage({ type: "success", message: "Allocation preferences saved!" });
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        message: err.response?.data?.message || "Failed to update allocation preference",
      });
    }
  };

  const getScoreTheme = (score) => {
    if (score >= 85) return { badge: "emerald", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
    if (score >= 70) return { badge: "indigo", text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" };
    if (score >= 50) return { badge: "amber", text: "text-amber-800", bg: "bg-amber-50", border: "border-amber-200" };
    return { badge: "default", text: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" };
  };

  // State: Preferences incomplete
  if (preferencesIncomplete) {
    return (
      <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/25 text-3xl mb-6">
            📋
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Complete Questionnaire to Access Groups
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-slate-600 leading-relaxed">
            Roommate groups require completed lifestyle answers to evaluate mutual compatibility and prevent room conflicts.
          </p>
          <div className="mt-8">
            <Link
              href="/dashboard/preferences"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow hover:bg-indigo-700 transition-all"
            >
              Start 4-Step Questionnaire &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse" />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 1: NO ACTIVE GROUP
  // --------------------------------------------------------------------------
  if (!group) {
    return (
      <div className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Roommate Group Formation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Form a residential group to reserve a room with your preferred roommates, or choose automatic placement.
          </p>
        </div>

        {alertMessage && (
          <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />
        )}

        {/* 3 Room Option Cards */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Option 1: Create a Group & Choose Roommates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                size: 2,
                title: "2-Bed Room (Double)",
                badge: "Double Sharing",
                subtitle: "You + 1 Roommate",
                desc: "Ideal for pairs seeking quiet focus and shared accountability with one trusted peer.",
                icon: "👥",
              },
              {
                size: 3,
                title: "3-Bed Room (Triple)",
                badge: "Triple Sharing",
                subtitle: "You + 2 Roommates",
                desc: "A balanced social environment with two compatible peers sharing study and living space.",
                icon: "🧑‍🤝‍🧑",
              },
              {
                size: 4,
                title: "4-Bed Room (Quad)",
                badge: "Quad Sharing",
                subtitle: "You + 3 Roommates",
                desc: "Vibrant and collaborative living suite. Fill 4 seats with peers of matching lifestyle habits.",
                icon: "🏠",
              },
            ].map((opt) => (
              <div
                key={opt.size}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{opt.icon}</span>
                    <Badge variant="indigo" size="sm">
                      {opt.badge}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {opt.title}
                  </h3>
                  <p className="text-xs font-semibold text-indigo-600 mt-0.5">{opt.subtitle}</p>
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">{opt.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    loading={creatingSize === opt.size}
                    onClick={() => handleCreateGroup(opt.size)}
                  >
                    Create {opt.size}-Bed Group &rarr;
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Option 2: Auto-Assign Option Card */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🤖</span> Option 2: Prefer Automatic Placement?
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                If you do not wish to build a custom roommate group, you can opt into the institutional
                auto-placement pool. Our automated allocation solver will place you with compatible peers based on your questionnaire answers.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                aria-label="Preferred room size for auto-assignment"
                value={intent.preferredRoomSize}
                onChange={(e) => handleSaveIntent("auto", Number(e.target.value))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
              >
                {GROUP_SIZE_OPTIONS.map((sz) => (
                  <option key={sz} value={sz}>
                    Prefer {sz}-Bed Room
                  </option>
                ))}
              </select>

              <Button
                variant={intent.mode === "auto" ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleSaveIntent("auto", intent.preferredRoomSize)}
              >
                {intent.mode === "auto" ? "✓ Auto-Assign Selected" : "Choose Auto-Assign"}
              </Button>
            </div>
          </div>

          {/* Auto-Assign Room Preferences Card */}
          {intent.mode === "auto" && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <RoomPreferencesCard
                isLeader={true}
                isLocked={false}
                targetSize={intent.preferredRoomSize || 2}
                onPreferencesUpdated={fetchGroupData}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ACTIVE GROUP VIEW (Forming, Complete, or Locked)
  // --------------------------------------------------------------------------
  const avgTheme = getScoreTheme(group.averageScore);
  const lowTheme = getScoreTheme(group.lowestPairScore);

  return (
    <div className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              My Roommate Group
            </h1>
            <Badge
              variant={
                group.status === "complete"
                  ? "emerald"
                  : group.status === "locked"
                  ? "purple"
                  : "indigo"
              }
              size="md"
            >
              {group.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
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

      {alertMessage && (
        <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />
      )}

      {/* State 3: Complete Group Banner */}
      {group.status === "complete" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6 flex items-start gap-4 shadow-sm animate-in fade-in">
          <span className="text-3xl">🎉</span>
          <div className="flex-1">
            <h3 className="text-base font-bold text-emerald-900">Your Group is Complete!</h3>
            <p className="text-xs sm:text-sm text-emerald-800 mt-1 leading-relaxed">
              All {group.targetSize} seats have been filled with compatible roommates. Your group is ready and waiting for the residential warden to allocate an accommodation block.
            </p>
            {group.roomPreferences && (
              <div className="mt-3 pt-3 border-t border-emerald-200/80 flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-950">
                <span className="bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                  🏛️ 1st Choice: {group.roomPreferences.preferredHostels?.[0]?.name || "Flexible"}
                </span>
                <span className="bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
                  ❄️ {group.roomPreferences.acType || "no-preference"}
                </span>
                <span className="bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200 capitalize">
                  🏢 {group.roomPreferences.floorPreference || "any"} floor
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* State 4: Locked Group Banner */}
      {group.status === "locked" && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 sm:p-6 flex items-start gap-4 shadow-sm animate-in fade-in">
          <span className="text-3xl">🔒</span>
          <div>
            <h3 className="text-base font-bold text-purple-900">Group Allocation Finalized</h3>
            <p className="text-xs sm:text-sm text-purple-800 mt-1 leading-relaxed">
              A room has been allocated to this group. Group membership is locked and can no longer be edited.
            </p>
          </div>
        </div>
      )}

      {/* Seat Visualization & Compatibility Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Room Seats & Members</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {group.seatsFilled} of {group.targetSize} seats reserved ({group.seatsRemaining} remaining)
            </p>
          </div>

          {/* Leader change size dropdown */}
          {group.myRole === "leader" && group.status !== "locked" && (
            <div className="flex items-center gap-2">
              <label htmlFor="changeGroupSizeSelect" className="text-xs font-semibold text-slate-600">
                Change Room Size:
              </label>
              <select
                id="changeGroupSizeSelect"
                value={group.targetSize}
                onChange={(e) => handleUpdateTargetSize(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800"
              >
                {GROUP_SIZE_OPTIONS.map((sz) => (
                  <option key={sz} value={sz} disabled={sz < group.seatsFilled}>
                    {sz} Beds {sz < group.seatsFilled ? `(Has ${group.seatsFilled} members)` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Seat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: group.targetSize }).map((_, index) => {
            const member = group.members[index];
            if (member) {
              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-white p-4 flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-xs font-extrabold text-white">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      {member.isLeader ? (
                        <Badge variant="indigo" size="sm">
                          Leader 👑
                        </Badge>
                      ) : (
                        <Badge variant="default" size="sm">
                          Member
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 truncate">{member.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {member.course} • Year {member.year}
                    </p>
                  </div>

                  {/* Leader remove button */}
                  {group.myRole === "leader" && !member.isLeader && group.status !== "locked" && (
                    <div className="mt-4 pt-3 border-t border-indigo-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDialog({
                            isOpen: true,
                            title: "Remove Group Member",
                            message: `Are you sure you want to remove ${member.name} from the group?`,
                            action: () => handleRemoveMember(member.id),
                            variant: "warning",
                          })
                        }
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={`empty-${index}`}
                className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-4 flex flex-col items-center justify-center text-center min-h-[140px]"
              >
                <span className="text-2xl text-slate-300">🛏️</span>
                <span className="text-xs font-bold text-slate-400 mt-2">Available Seat</span>
                <span className="text-[10px] text-slate-400">Waiting for roommate</span>
              </div>
            );
          })}
        </div>

        {/* Group Scores Metrics */}
        {group.members.length > 1 && (
          <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${avgTheme.border} ${avgTheme.bg} flex items-center justify-between`}>
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Group Average Compatibility
                </span>
                <span className="text-xs text-slate-500">Calculated across all member pairs</span>
              </div>
              <span className={`text-2xl font-black ${avgTheme.text}`}>
                {group.averageScore}%
              </span>
            </div>

            <div className={`p-4 rounded-xl border ${lowTheme.border} ${lowTheme.bg} flex items-center justify-between`}>
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Lowest Pair Score
                </span>
                <span className="text-xs text-slate-500">Weakest link compatibility</span>
              </div>
              <span className={`text-2xl font-black ${lowTheme.text}`}>
                {group.lowestPairScore}%
              </span>
            </div>
          </div>
        )}

        {/* Per-Pair Breakdown Table */}
        {group.pairScores?.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pairwise Match Ratings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {group.pairScores.map((pair, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-800 truncate mr-2">
                    {pair.memberA} ↔ {pair.memberB}
                  </span>
                  <Badge variant={getScoreTheme(pair.score).badge} size="sm">
                    {pair.score}% {pair.label}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Room Preferences Section */}
      <RoomPreferencesCard
        isLeader={group.myRole === "leader"}
        isLocked={group.status === "locked"}
        targetSize={group.targetSize}
        onPreferencesUpdated={fetchGroupData}
      />

      {/* Pending Invitations Sent by Leader */}
      {group.myRole === "leader" && group.pendingInvitations?.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Pending Sent Invitations ({group.pendingInvitations.length})
          </h3>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {group.pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{inv.invitedUser?.name}</h4>
                  <p className="text-xs text-slate-500">
                    {inv.invitedUser?.course} • Year {inv.invitedUser?.year}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-600">
                      Fit: Avg <strong>{inv.scoreSnapshot?.average}%</strong>
                    </span>
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      Expires in {inv.daysLeft} day{inv.daysLeft === 1 ? "" : "s"}
                    </span>
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
        </div>
      )}

      {/* Leader's Candidate Discovery Section */}
      {group.myRole === "leader" && group.status === "forming" && group.seatsRemaining > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Recommended Candidates ({candidates.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
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
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
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
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                🗣️ Shares Language
              </button>
            </div>
          </div>

          {candidatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-xl border border-slate-200 bg-slate-50 p-4 animate-pulse" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No Candidates Found"
              description="No students currently match your group criteria or filter settings."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((c) => (
                <div
                  key={c.candidate.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs hover:border-indigo-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{c.candidate.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.candidate.course} • Year {c.candidate.year}
                        </p>
                      </div>

                      <Badge variant={getScoreTheme(c.groupAverage).badge} size="sm">
                        {c.groupAverage}% Fit
                      </Badge>
                    </div>

                    {/* Per-member score chips */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Compatibility with Members:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {c.perMemberScores?.map((ps, idx) => (
                          <span
                            key={idx}
                            className="inline-flex text-[10px] font-semibold bg-slate-100 text-slate-700 rounded px-1.5 py-0.5"
                          >
                            {ps.memberName}: {ps.score}%
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Shared languages */}
                    {c.sharedLanguages?.length > 0 && (
                      <div className="mt-2 text-[11px] text-indigo-700">
                        🗣️ {c.sharedLanguages.join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      loading={invitingId === c.candidate.id}
                      onClick={() => handleSendInvite(c.candidate.id)}
                    >
                      Invite to Group &rarr;
                    </Button>
                  </div>
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
