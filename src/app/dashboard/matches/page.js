"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";

export default function StudentMatchesPage() {
  const [activeTab, setActiveTab] = useState("students"); // "students" | "groups"
  const [loading, setLoading] = useState(true);
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
  const [toastMessage, setToastMessage] = useState(null);

  // Groups Tab State
  const [openGroups, setOpenGroups] = useState([]);
  const [groupsTotal, setGroupsTotal] = useState(0);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsTotalPages, setGroupsTotalPages] = useState(1);
  const [groupsLoading, setGroupsLoading] = useState(false);
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
        }
      } catch (err) {
        if (err.response?.status === 409 || err.response?.data?.details?.code === "PREFERENCES_INCOMPLETE") {
          setPreferencesIncomplete(true);
        } else {
          console.error("Failed to load roommate matches:", err);
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
          setOpenGroups(data.groups || []);
          setGroupsTotal(data.total || 0);
          setGroupsPage(data.page || 1);
          setGroupsTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("Failed to load open groups:", err);
      } finally {
        setGroupsLoading(false);
      }
    },
    [groupsPage, minScore, sameYearOnly, sharedLanguageOnly]
  );

  const handleInviteToGroup = async (userId) => {
    setInvitingId(userId);
    setToastMessage(null);
    try {
      const res = await api.post("/groups/me/invitations", { userId });
      if (res.data?.success) {
        setInvitedUserIds((prev) => new Set([...prev, userId]));
        setToastMessage({ type: "success", text: "Invitation sent to candidate!" });
      }
    } catch (err) {
      setToastMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to send invitation",
      });
    } finally {
      setInvitingId(null);
    }
  };

  const handleOpenGroupModal = async (groupItem) => {
    setIsGroupModalOpen(true);
    setGroupModalLoading(true);
    setJoinMessage("");
    try {
      const res = await api.get(`/groups/open/${groupItem.id}`);
      if (res.data?.success) {
        setSelectedGroup(res.data.data);
      } else {
        setSelectedGroup(groupItem);
      }
    } catch (err) {
      console.error("Failed to load group details:", err);
      setSelectedGroup(groupItem);
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
    setSendingJoinRequest(true);
    setToastMessage(null);
    try {
      const res = await api.post(`/groups/open/${selectedGroup.id}/join-requests`, {
        message: joinMessage.trim(),
      });
      if (res.data?.success) {
        setRequestedGroupIds((prev) => new Set([...prev, selectedGroup.id]));
        setToastMessage({ type: "success", text: "Join request sent to group leader!" });
        handleCloseGroupModal();
        fetchOpenGroups(groupsPage);
      }
    } catch (err) {
      setToastMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to send join request",
      });
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

  const getScoreTheme = (label) => {
    switch (label) {
      case "Excellent":
        return {
          badge: "emerald",
          text: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          ring: "ring-emerald-500",
          bar: "bg-emerald-500",
        };
      case "Good":
        return {
          badge: "indigo",
          text: "text-indigo-700",
          bg: "bg-indigo-50",
          border: "border-indigo-200",
          ring: "ring-indigo-500",
          bar: "bg-indigo-500",
        };
      case "Fair":
        return {
          badge: "amber",
          text: "text-amber-800",
          bg: "bg-amber-50",
          border: "border-amber-200",
          ring: "ring-amber-500",
          bar: "bg-amber-500",
        };
      default:
        return {
          badge: "default",
          text: "text-slate-700",
          bg: "bg-slate-50",
          border: "border-slate-200",
          ring: "ring-slate-400",
          bar: "bg-slate-400",
        };
    }
  };

  // State: Preferences Not Completed Call-To-Action
  if (preferencesIncomplete) {
    return (
      <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/25 text-3xl mb-6">
            📋
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Complete Your Preferences to Unlock Matches
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-slate-600 leading-relaxed">
            Our roommate compatibility engine calculates mutual affinity based on your daily routine,
            sleep hours, noise tolerance, study habits, and living standards. Answer our questionnaire
            to explore your top matches and browse open groups.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard/preferences"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-all"
            >
              Start Lifestyle Questionnaire &rarr;
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State: Single Room Selection (No Roommates Needed)
  if (singleRoom) {
    return (
      <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/25 text-3xl mb-6">
            🛏️
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Single Room Selected
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-slate-600 leading-relaxed">
            You chose a single room, so no roommate matching is needed. You will be allocated a 1-bed room independently without roommates.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard/preferences"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-all"
            >
              Change room type preference &rarr;
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State: In Complete or Locked Group Banner, or Non-Leader Member
  if (groupStatusBanner) {
    return (
      <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white text-2xl mb-4">
            🏠
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {groupStatusBanner.status === "complete"
              ? "Your Roommate Group is Complete"
              : groupStatusBanner.status === "locked"
              ? "Your Room Allocation is Finalized"
              : "Roommate Group Membership Active"}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-xs sm:text-sm text-slate-600 leading-relaxed">
            {groupStatusBanner.status === "complete"
              ? `All ${groupStatusBanner.targetSize} seats in your group have been filled. You can review your room or group details.`
              : groupStatusBanner.status === "locked"
              ? "Your room assignment has been locked. Check your room assignment under My Room."
              : "You belong to a roommate group as a member. Prospective roommate invitations and group roster changes are managed by your group leader."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/dashboard/group"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700 transition-all"
            >
              Go to My Group &rarr;
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {toastMessage && (
        <Alert
          type={toastMessage.type}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Roommate Matching &amp; Groups
            </h1>
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
              Algorithm v1.0
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Discover compatible roommates of the same gender and room size, or browse forming groups with open seats.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/preferences"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <span>⚙️</span> Edit My Preferences
          </Link>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "students"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span>👤 Individual Students</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
            {total}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("groups")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "groups"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span>👥 Groups Open to Join</span>
          <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-full font-semibold">
            {groupsTotal}
          </span>
        </button>
      </div>

      {/* Filter & Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Min Score Slider */}
          <div className="flex-1 max-w-md space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="minScoreRange" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Minimum Score Threshold
              </label>
              <span className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-extrabold text-indigo-700">
                {minScore}% & above
              </span>
            </div>
            <input
              id="minScoreRange"
              type="range"
              min="0"
              max="95"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>All (0%)</span>
              <span>Fair (50%)</span>
              <span>Good (70%)</span>
              <span>Top Tier (85%+)</span>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSameYearOnly(!sameYearOnly)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                sameYearOnly
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>🎓</span>
              <span>Same Year Only</span>
              {sameYearOnly && <span className="text-[10px]">✓</span>}
            </button>

            <button
              type="button"
              onClick={() => setSharedLanguageOnly(!sharedLanguageOnly)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                sharedLanguageOnly
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>🗣️</span>
              <span>Shares a Language</span>
              {sharedLanguageOnly && <span className="text-[10px]">✓</span>}
            </button>

            {(minScore > 0 || sameYearOnly || sharedLanguageOnly) && (
              <button
                type="button"
                onClick={() => {
                  setMinScore(0);
                  setSameYearOnly(false);
                  setSharedLanguageOnly(false);
                }}
                className="text-xs text-rose-600 hover:underline font-semibold px-2 py-1"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-900">{activeTab === "students" ? total : groupsTotal}</strong> {activeTab === "students" ? "candidate" : "open group"}{(activeTab === "students" ? total : groupsTotal) === 1 ? "" : "s"}
          </span>
          <span className="text-[11px] text-slate-400">
            Strict deal-breaker violations &amp; gender/room size mismatches are automatically filtered out
          </span>
        </div>
      </div>

      {/* TAB 1: INDIVIDUAL STUDENTS */}
      {activeTab === "students" && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-32 bg-slate-200 rounded" />
                    <div className="h-8 w-16 bg-slate-200 rounded-full" />
                  </div>
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <div className="h-3 w-full bg-slate-100 rounded" />
                    <div className="h-3 w-3/4 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : matches.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No Student Matches Found"
              description="No candidates match your current threshold and filters. Try lowering the minimum score or resetting filters."
              action={
                <Button
                  variant="outline"
                  size="sm"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((item) => {
                const theme = getScoreTheme(item.label);
                return (
                  <div
                    key={item.id}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
                  >
                    <div>
                      {/* Top: Name & Score Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {item.course} {item.department ? `• ${item.department}` : ""}
                          </p>
                        </div>

                        {/* Circular Score Badge */}
                        <div
                          className={`flex flex-col items-center justify-center rounded-2xl ${theme.bg} ${theme.border} border px-3 py-1.5 min-w-[68px] shadow-xs`}
                        >
                          <span className={`text-lg font-extrabold leading-tight ${theme.text}`}>
                            {item.score}%
                          </span>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                            {item.label}
                          </span>
                        </div>
                      </div>

                      {/* Badges: Year, Languages, In Group */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        {item.year && (
                          <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-md px-2 py-0.5">
                            Year {item.year}
                          </span>
                        )}
                        {item.sharedLanguages?.length > 0 && (
                          <span className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-0.5">
                            🗣️ {item.sharedLanguages.join(", ")}
                          </span>
                        )}
                        {item.inGroup && (
                          <span className="inline-flex items-center text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-2 py-0.5">
                            👥 In Group ({item.inGroup.filledSeats}/{item.inGroup.targetSize})
                          </span>
                        )}
                      </div>

                      {/* Top Friendly Reasons Chips */}
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Key Compatibilities
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {item.reasons?.slice(0, 3).map((r, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 text-xs text-slate-700"
                            >
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span className="truncate">{r}</span>
                            </div>
                          ))}
                        </div>

                        {/* Warnings (if any) */}
                        {item.warnings?.length > 0 && (
                          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1">
                            <span>⚠️</span>
                            <span className="truncate">{item.warnings[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(item)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                      >
                        View Details &rarr;
                      </button>

                      <div className="flex items-center">
                        <Button
                          variant={invitedUserIds.has(item.id) ? "outline" : "primary"}
                          size="sm"
                          disabled={invitedUserIds.has(item.id) || invitingId === item.id}
                          loading={invitingId === item.id}
                          onClick={() => handleInviteToGroup(item.id)}
                        >
                          {invitedUserIds.has(item.id) ? "Invited ✓" : "Invite to Room"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* TAB 2: GROUPS OPEN TO JOIN */}
      {activeTab === "groups" && (
        <>
          {groupsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-32 bg-slate-200 rounded" />
                    <div className="h-8 w-16 bg-slate-200 rounded-full" />
                  </div>
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : openGroups.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No Open Groups Found"
              description="There are currently no open forming groups matching your room size, gender, and score thresholds. You can start your own group from the My Group page!"
              action={
                <Link
                  href="/dashboard/group"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                  Create My Group &rarr;
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openGroups.map((g) => {
                const isRequested = requestedGroupIds.has(g.id) || g.userRequestStatus === "pending";
                return (
                  <div
                    key={g.id}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
                  >
                    <div>
                      {/* Top: Header & Score */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {g.leader?.name ? `${g.leader.name}'s Group` : "Roommate Group"}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Leader: {g.leader?.name || "Student"} {g.leader?.year ? `• Year ${g.leader.year}` : ""}
                          </p>
                        </div>

                        {/* Compatibility Score with Group */}
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 min-w-[68px] shadow-xs">
                          <span className="text-lg font-extrabold leading-tight text-indigo-700">
                            {g.fit?.viewerAvgScore || g.averageScore || 0}%
                          </span>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                            Match
                          </span>
                        </div>
                      </div>

                      {/* Seat Dots & Target Size */}
                      <div className="mt-4 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">Seats:</span>
                          <div className="flex items-center gap-1.5">
                            {Array.from({ length: g.targetSize || 2 }).map((_, idx) => (
                              <span
                                key={idx}
                                className={`h-3 w-3 rounded-full ${
                                  idx < (g.seatsFilled || g.members?.length || 1)
                                    ? "bg-indigo-600 ring-2 ring-indigo-200"
                                    : "bg-slate-200 border border-slate-300"
                                }`}
                                title={idx < (g.seatsFilled || 1) ? "Filled seat" : "Open seat"}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-slate-600">
                            {g.seatsFilled || g.members?.length || 1} / {g.targetSize}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-700 bg-white border border-indigo-100 px-2 py-0.5 rounded-md">
                          {g.freeSeats} free seat{g.freeSeats === 1 ? "" : "s"}
                        </span>
                      </div>

                      {/* Room Claimed Badge if group has selected room */}
                      {g.selectedRoom && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                          <span>🏢</span>
                          <span className="truncate">
                            Room #{g.selectedRoom.roomNumber} ({g.selectedRoom.hostelName || "Hostel"}) Claimed
                          </span>
                        </div>
                      )}

                      {/* Members preview */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Current Members
                        </p>
                        <div className="space-y-1">
                          {(g.members || []).map((m, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-slate-600">
                              <span className="font-medium text-slate-800 truncate">
                                {m.name} {m.isLeader ? "(Leader)" : ""}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                {m.course || "Student"} {m.year ? `Yr ${m.year}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenGroupModal(g)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                      >
                        Inspect Impact &rarr;
                      </button>

                      <div>
                        {isRequested ? (
                          <Badge variant="amber" size="sm">
                            Request Pending ⏳
                          </Badge>
                        ) : g.cooldownActive ? (
                          <Badge variant="default" size="sm">
                            Cooldown 24h
                          </Badge>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenGroupModal(g)}
                          >
                            Request to Join
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Groups Pagination */}
          <Pagination
            currentPage={groupsPage}
            totalPages={groupsTotalPages}
            totalItems={groupsTotal}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* MODAL 1: Individual Student Compatibility Breakdown */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedMatch ? `Compatibility Breakdown: ${selectedMatch.name}` : ""}
        description={
          selectedMatch
            ? `${selectedMatch.course} ${selectedMatch.year ? `• Year ${selectedMatch.year}` : ""}`
            : ""
        }
        maxWidth="max-w-2xl"
      >
        {selectedMatch && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl font-black ${
                    getScoreTheme(selectedMatch.label).bg
                  } ${getScoreTheme(selectedMatch.label).text}`}
                >
                  {selectedMatch.score}%
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      Overall Match: {selectedMatch.label}
                    </span>
                    <Badge variant={getScoreTheme(selectedMatch.label).badge} size="sm">
                      {selectedMatch.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Base Weighted Score: {selectedMatch.baseScore}%{" "}
                    {selectedMatch.yearBonus > 0 && `(+${selectedMatch.yearBonus}% Year Bonus)`}
                  </p>
                </div>
              </div>

              {selectedMatch.sharedLanguages?.length > 0 && (
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Shared Languages
                  </span>
                  <span className="text-xs font-bold text-indigo-700">
                    {selectedMatch.sharedLanguages.join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Category Breakdown Bars */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Category Affinity Scores (7 Dimensions)
              </h4>
              <div className="space-y-2.5">
                {selectedMatch.breakdown?.map((cat) => (
                  <div key={cat.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{cat.label}</span>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span>{cat.points} / {cat.weight} pts</span>
                        <span className="font-bold text-slate-900 w-10 text-right">
                          {cat.percent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          cat.percent >= 75
                            ? "bg-emerald-500"
                            : cat.percent >= 50
                            ? "bg-indigo-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlights */}
            {selectedMatch.reasons?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Compatibility Highlights
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedMatch.reasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-950"
                    >
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={handleCloseModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Open Group Inspection & Join Request Dialog */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={handleCloseGroupModal}
        title={selectedGroup ? `Group Fit: ${selectedGroup.leader?.name || "Roommate Group"}` : "Group Details"}
        description={selectedGroup ? `${selectedGroup.targetSize}-Bed Room Group (${selectedGroup.freeSeats} free seats)` : ""}
        maxWidth="max-w-2xl"
      >
        {groupModalLoading ? (
          <div className="py-12 text-center text-slate-500">Loading group details…</div>
        ) : selectedGroup && (
          <div className="space-y-6">
            {/* Group Impact Preview Box */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-2">
                Group Compatibility Impact Preview
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Avg</span>
                  <span className="text-lg font-black text-slate-800">{selectedGroup.averageScore || 0}%</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Fit Avg</span>
                  <span className="text-lg font-black text-indigo-600">{selectedGroup.fit?.viewerAvgScore || 0}%</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">New Group Avg</span>
                  <span className="text-lg font-black text-emerald-600">
                    {selectedGroup.impact?.newAverage || selectedGroup.fit?.viewerAvgScore || selectedGroup.averageScore || 0}%
                  </span>
                </div>
              </div>
              {selectedGroup.impact && (
                <p className="text-xs text-indigo-900/80 mt-2 text-center">
                  Lowest pairwise compatibility in group will be <strong>{selectedGroup.impact.newLowestPair}%</strong>.
                </p>
              )}
            </div>

            {/* Pairwise Fits with Current Members */}
            {selectedGroup.fit?.memberScores && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Your Fit With Each Group Member
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {selectedGroup.fit.memberScores.map((ms, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{ms.name}</span>
                          {ms.isLeader && <Badge variant="indigo" size="sm">Leader</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ms.course} {ms.year ? `• Year ${ms.year}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-indigo-700">{ms.score}%</span>
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase">{ms.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Room Info if claimed */}
            {selectedGroup.selectedRoom && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                <span>🏢</span>
                <span>
                  This group has already claimed <strong>Room #{selectedGroup.selectedRoom.roomNumber}</strong> in <strong>{selectedGroup.selectedRoom.hostelName || "Hostel"}</strong>. Joining will automatically secure your bed in this room.
                </span>
              </div>
            )}

            {/* Optional message input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="joinMessageInput" className="text-xs font-bold text-slate-700">
                  Optional note to leader (e.g. your branch or why you would fit):
                </label>
                <span className={`text-[11px] font-medium ${joinMessage.length > 200 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                  {joinMessage.length} / 200
                </span>
              </div>
              <textarea
                id="joinMessageInput"
                rows={3}
                maxLength={200}
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Hi, I'm quiet during nights and looking for roommates who study together..."
                className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Privacy notice */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 text-center">
              🛡️ <strong>Privacy Protection:</strong> The leader will only see your compatibility scores, shared languages, academic program, and this note. Your raw questionnaire answers and contact details remain strictly private.
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={handleCloseGroupModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={sendingJoinRequest}
                disabled={sendingJoinRequest || requestedGroupIds.has(selectedGroup.id) || selectedGroup.userRequestStatus === "pending"}
                onClick={handleSendJoinRequest}
              >
                {requestedGroupIds.has(selectedGroup.id) || selectedGroup.userRequestStatus === "pending"
                  ? "Request Pending ✓"
                  : "Send Request to Join"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
