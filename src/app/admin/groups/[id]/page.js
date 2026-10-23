"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function AdminGroupDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const groupId = params.id;

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals for actions
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [isDisbandOpen, setIsDisbandOpen] = useState(false);
  const [disbanding, setDisbanding] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`/api/admin/groups/${groupId}`);
      if (res.data?.success) {
        setGroup(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load group details:", err);
      setError(err.response?.data?.message || "Failed to retrieve group details");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      setRemoving(true);
      await axios.post(`/api/admin/groups/${groupId}/remove-member`, {
        userId: memberToRemove.user?._id || memberToRemove.user,
      });
      setIsRemoveOpen(false);
      setMemberToRemove(null);
      await fetchGroup();
    } catch (err) {
      console.error("Failed to remove member:", err);
      alert(err.response?.data?.message || "Could not remove member");
    } finally {
      setRemoving(false);
    }
  };

  const handleConfirmDisband = async () => {
    try {
      setDisbanding(true);
      await axios.post(`/api/admin/groups/${groupId}/disband`);
      setIsDisbandOpen(false);
      await fetchGroup();
    } catch (err) {
      console.error("Failed to disband group:", err);
      alert(err.response?.data?.message || "Could not disband group");
    } finally {
      setDisbanding(false);
    }
  };

  const getStatusBadge = (grpStatus) => {
    switch (grpStatus) {
      case "forming":
        return <Badge variant="info">Forming</Badge>;
      case "complete":
        return <Badge variant="success">Complete</Badge>;
      case "locked":
        return <Badge variant="purple">Locked</Badge>;
      case "disbanded":
        return <Badge variant="neutral">Disbanded</Badge>;
      default:
        return <Badge variant="neutral">{grpStatus}</Badge>;
    }
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return "text-slate-400";
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-rose-700 bg-rose-50 border-rose-200";
  };

  if (loading) {
    return (
      <div className="flex-1 py-16 px-4 max-w-7xl mx-auto w-full text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
        <p className="mt-3 text-xs font-semibold text-slate-500">Loading group diagnostics...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex-1 py-12 px-4 max-w-4xl mx-auto w-full">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-bold text-rose-800">{error || "Group not found"}</p>
          <Link
            href="/admin/groups"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs"
          >
            &larr; Back to Groups List
          </Link>
        </div>
      </div>
    );
  }

  const isLocked = group.status === "locked";
  const isDisbanded = group.status === "disbanded";
  const leaderId = group.leader?._id?.toString() || group.leader?.toString();

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/groups"
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            &larr; Back to Groups
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Group #{group._id.slice(-6).toUpperCase()}
            </h1>
            {getStatusBadge(group.status)}
            {group.isDemo && (
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Demo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Created on {new Date(group.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Admin Overrides */}
        <div className="flex items-center gap-2">
          {!isLocked && !isDisbanded && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDisbandOpen(true)}
            >
              Disband Group
            </Button>
          )}
        </div>
      </div>

      {/* Locked Notice */}
      {isLocked && (
        <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-purple-900 flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950">Group is Locked</h3>
            <p className="text-xs text-purple-800 mt-0.5">
              A residential hostel room has already been officially allocated to this group. To modify or remove members, the room allocation must be cancelled or released first in the Allocation console.
            </p>
          </div>
        </div>
      )}

      {/* Disbanded Notice */}
      {isDisbanded && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-800 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Group Disbanded</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              This group was disbanded on {new Date(group.disbandedAt || group.updatedAt).toLocaleDateString()}. Its seats are no longer active.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Beds Capacity</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {group.members?.length || 0} / {group.targetSize} Filled
          </div>
          <span className="text-[11px] text-slate-400 capitalize">{group.gender} wing</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Group Average Score</span>
          <div className="text-xl font-black text-indigo-600 mt-1">
            {group.averageScore !== null && group.averageScore !== undefined
              ? `${group.averageScore}%`
              : "N/A"}
          </div>
          <span className="text-[11px] text-slate-400">Pairwise mean</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Lowest Pair Score</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {group.lowestPairScore !== null && group.lowestPairScore !== undefined
              ? `${group.lowestPairScore}%`
              : "N/A"}
          </div>
          <span className="text-[11px] text-slate-400">Bottleneck tolerance</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Engine Version</span>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            {group.engineVersion || "1.0"}
          </div>
          <span className="text-[11px] text-slate-400">Algorithm build</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Members List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Members Roster ({group.members?.length || 0} of {group.targetSize})
            </h2>
          </div>

          <div className="space-y-3">
            {group.members?.map((m) => {
              const u = m.user || {};
              const isGroupLeader = u._id?.toString() === leaderId;

              return (
                <div
                  key={u._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-sm border border-indigo-100">
                      {u.name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{u.name}</span>
                        {isGroupLeader && (
                          <span className="rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold">
                            Leader
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {u.registrationNumber || "Reg No N/A"} · {u.email}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {u.course || "No Course"} • {u.department || "General"} {u.year ? `• Year ${u.year}` : ""}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Joined: {new Date(m.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions for member */}
                  <div className="flex sm:flex-col items-end gap-2 shrink-0">
                    <Link
                      href={`/admin/students`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      View Student &rarr;
                    </Link>
                    {!isLocked && !isDisbanded && (
                      <button
                        type="button"
                        onClick={() => {
                          setMemberToRemove(m);
                          setIsRemoveOpen(true);
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                      >
                        Remove from Group
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty Seats Visualizer */}
          {group.members?.length < group.targetSize && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center bg-slate-50/50">
              <span className="text-2xl text-slate-400">🛏️</span>
              <p className="text-xs font-bold text-slate-600 mt-1">
                {group.targetSize - group.members.length} Unfilled Bed(s) Remaining
              </p>
              <p className="text-[11px] text-slate-400">
                Group status is currently <span className="font-semibold text-indigo-600">forming</span>. Leader can invite candidates.
              </p>
            </div>
          )}
        </div>

        {/* Pairwise Scores Diagnostics (1 Col) */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Pairwise Compatibility</h2>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            {(!group.pairScores || group.pairScores.length === 0) ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Need at least 2 members to evaluate pairwise compatibility scores.
              </p>
            ) : (
              <div className="space-y-3">
                {group.pairScores.map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate max-w-[150px]">
                        {pair.memberA} &amp; {pair.memberB}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${getScoreColor(
                          pair.score
                        )}`}
                      >
                        {pair.score}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Label: {pair.label || "Matched"}</span>
                      {pair.excluded ? (
                        <span className="font-bold text-rose-600">Deal-breaker alert</span>
                      ) : (
                        <span className="font-medium text-emerald-600">Compatible</span>
                      )}
                    </div>

                    {pair.violations && pair.violations.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-slate-200 text-[10px] text-rose-700">
                        {pair.violations.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remove Member Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isRemoveOpen}
        onClose={() => setIsRemoveOpen(false)}
        onConfirm={handleConfirmRemove}
        title="Remove Member from Group"
        message={`Are you sure you want to remove ${memberToRemove?.user?.name || "this student"} from this group? If this is the leader, leadership will pass to the next member or disband if empty.`}
        confirmText="Remove Member"
        confirmVariant="danger"
        loading={removing}
      />

      {/* Disband Group Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDisbandOpen}
        onClose={() => setIsDisbandOpen(false)}
        onConfirm={handleConfirmDisband}
        title="Disband Roommate Group"
        message="Are you sure you want to disband this group? All members will be freed to form new groups or choose auto-assignment, and all pending invitations will be cancelled immediately."
        confirmText="Disband Group"
        confirmVariant="danger"
        loading={disbanding}
      />
    </div>
  );
}
