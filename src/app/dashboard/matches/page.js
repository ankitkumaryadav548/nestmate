"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";

export default function StudentMatchesPage() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [preferencesIncomplete, setPreferencesIncomplete] = useState(false);
  const [groupStatusBanner, setGroupStatusBanner] = useState(null);
  const [leaderGroup, setLeaderGroup] = useState(null);
  const [invitedUserIds, setInvitedUserIds] = useState(new Set());
  const [invitingId, setInvitingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [minScore, setMinScore] = useState(0);
  const [sameYearOnly, setSameYearOnly] = useState(false);
  const [sharedLanguageOnly, setSharedLanguageOnly] = useState(false);

  // Modal inspection
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

  useEffect(() => {
    fetchMatches(1);
  }, [minScore, sameYearOnly, sharedLanguageOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchMatches(newPage);
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
            sleep hours, noise tolerance, study habits, and living standards. Answer our 4-step questionnaire
            to explore your top matches.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard/preferences"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-all"
            >
              Start 4-Step Questionnaire &rarr;
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
              ? `All ${groupStatusBanner.targetSize} seats in your group have been filled. The residential warden will allocate a room soon.`
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
              Roommate Matches
            </h1>
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
              Algorithm v1.0
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Discover compatible roommates of the same gender calculated from lifestyle & study habits.
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
              <span>All Candidates (0%)</span>
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
            Showing <strong className="text-slate-900">{total}</strong> eligible candidate{total === 1 ? "" : "s"}
          </span>
          <span className="text-[11px] text-slate-400">
            Strict deal-breaker violations & gender mismatches are automatically filtered out
          </span>
        </div>
      </div>

      {/* Matches Grid */}
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
          icon="🤝"
          title="No Compatible Roommates Found"
          description="No candidates matched your current threshold or filter criteria. Try lowering the minimum score slider or disabling the year/language toggles."
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

                  {/* Badges: Year & Languages */}
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
                    {leaderGroup && leaderGroup.freeSeats > 0 ? (
                      <Button
                        variant={invitedUserIds.has(item.id) ? "outline" : "primary"}
                        size="sm"
                        disabled={invitedUserIds.has(item.id) || invitingId === item.id}
                        loading={invitingId === item.id}
                        onClick={() => handleInviteToGroup(item.id)}
                      >
                        {invitedUserIds.has(item.id) ? "Invited ✓" : "Invite to group"}
                      </Button>
                    ) : (
                      <Link
                        href="/dashboard/group"
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        Create a group first &rarr;
                      </Link>
                    )}
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

      {/* Detailed Breakdown Modal */}
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
            {/* Header Score Banner */}
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
                    {/* Progress Bar */}
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

            {/* All Friendly Reasons */}
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

            {/* Warnings & Considerations */}
            {selectedMatch.warnings?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Differences to Keep in Mind
                </h4>
                <div className="space-y-1.5">
                  {selectedMatch.warnings.map((warn, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900"
                    >
                      <span>⚠️</span>
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Institutional Disclaimer */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed text-center">
              🛡️ <strong>Note:</strong> This score is a suggestion based on lifestyle answers.
              It does not guarantee compatibility. Individual preferences are kept strictly private and never disclosed to peers.
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={handleCloseModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
