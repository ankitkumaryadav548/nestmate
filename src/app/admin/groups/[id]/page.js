"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import {
  PageContainer,
  Card,
  Badge,
  Button,
  Avatar,
  ConfirmDialog,
  Alert,
  ScoreRing,
} from "@/components/ui";
import {
  AdminPageHeader,
  StatusBadge,
} from "@/components/admin";
import useDocumentTitle from "@/hooks/useDocumentTitle";

export default function AdminGroupDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const groupId = params.id;

  const [group, setGroup] = useState(null);
  useDocumentTitle(group ? `Group: ${group.name || group.leader?.name || "Details"}` : "Group Details", true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals for actions
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [isDisbandOpen, setIsDisbandOpen] = useState(false);
  const [disbanding, setDisbanding] = useState(false);

  const [isReleaseRoomOpen, setIsReleaseRoomOpen] = useState(false);
  const [releasingRoom, setReleasingRoom] = useState(false);
  const [cancellingReqId, setCancellingReqId] = useState(null);

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

  const handleConfirmReleaseRoom = async () => {
    try {
      setReleasingRoom(true);
      await axios.post(`/api/admin/groups/${groupId}/release-room`);
      setIsReleaseRoomOpen(false);
      await fetchGroup();
    } catch (err) {
      console.error("Failed to release room:", err);
      alert(err.response?.data?.message || "Could not release room");
    } finally {
      setReleasingRoom(false);
    }
  };

  const handleAdminCancelRequest = async (requestId) => {
    if (!confirm("Are you sure you want to cancel this join request administratively?")) return;
    try {
      setCancellingReqId(requestId);
      await axios.post(`/api/admin/join-requests/${requestId}/cancel`);
      await fetchGroup();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel request");
    } finally {
      setCancellingReqId(null);
    }
  };

  const getGroupStatusBadge = (grpStatus) => {
    switch (grpStatus) {
      case "forming":
        return <Badge variant="warning" size="sm" dot>Forming</Badge>;
      case "complete":
        return <Badge variant="success" size="sm" dot>Complete</Badge>;
      case "locked":
        return <Badge variant="brand" size="sm" dot>Locked</Badge>;
      case "disbanded":
        return <Badge variant="neutral" size="sm">Disbanded</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{grpStatus}</Badge>;
    }
  };

  if (loading) {
    return (
      <PageContainer maxWidth="7xl" className="py-8">
        <div className="h-64 animate-pulse rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
      </PageContainer>
    );
  }

  if (error || !group) {
    return (
      <PageContainer maxWidth="7xl" className="py-8">
        <Alert
          variant="danger"
          title="Group Not Found"
          action={
            <Button variant="outline" size="sm" onClick={fetchGroup}>
              Try again
            </Button>
          }
        >
          {error || "Group does not exist or has been disbanded."}
        </Alert>
        <div className="mt-4">
          <Link href="/admin/groups">
            <Button variant="secondary" size="sm">
              &larr; Back to Groups List
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const isLocked = group.status === "locked";
  const isDisbanded = group.status === "disbanded";
  const leaderId = group.leader?._id?.toString() || group.leader?.toString();

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Header */}
      <AdminPageHeader
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <span>Group #{group._id.slice(-6).toUpperCase()}</span>
            {getGroupStatusBadge(group.status)}
            {group.isDemo && (
              <Badge variant="warning" size="xs">
                Demo
              </Badge>
            )}
          </div>
        }
        description={`Created on ${new Date(group.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} • Target Size: ${group.targetSize}-Bed • Gender: ${group.gender}`}
        breadcrumbs={[
          { href: "/admin/groups", label: "Groups" },
          { label: `#${group._id.slice(-6).toUpperCase()}` },
        ]}
        actions={
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
        }
      />

      {/* Locked Notice */}
      {isLocked && (
        <div className="mb-6 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 p-4 text-purple-900 dark:text-purple-300 flex items-start gap-3">
          <span className="text-xl">’</span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950 dark:text-purple-200">
              Group is Locked
            </h3>
            <p className="text-xs text-purple-800 dark:text-purple-300/80 mt-0.5">
              A residential hostel room has already been officially allocated to this group. To modify or remove members, the room allocation must be cancelled or released first in the Allocation console.
            </p>
          </div>
        </div>
      )}

      {/* Disbanded Notice */}
      {isDisbanded && (
        <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-4 text-slate-800 dark:text-slate-300 flex items-start gap-3">
          <span className="text-xl">Warning:
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Group Disbanded
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              This group was disbanded on {new Date(group.disbandedAt || group.updatedAt).toLocaleDateString()}. Its seats are no longer active.
            </p>
          </div>
        </div>
      )}

      {/* Selected Room Banner (FCFS claim) */}
      {group.selectedRoom && (
        <Card className="mb-6 p-5 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="text-2xl">‘</span>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="xs">
                  FCFS Selected Room
                </Badge>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                  Room #{group.selectedRoom?.roomNumber || group.selectedRoom}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Claimed on {group.roomClaimedAt ? new Date(group.roomClaimedAt).toLocaleString() : "During Selection Window"}
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsReleaseRoomOpen(true)}
          >
            Release Room (Admin Override)
          </Button>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Beds Capacity</span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {group.members?.length || 0} / {group.targetSize} Filled
          </div>
          <span className="text-[11px] text-slate-400 capitalize">{group.gender} wing</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Average Compatibility</span>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
            {group.averageScore !== null && group.averageScore !== undefined
              ? `${group.averageScore}%`
              : "N/A"}
          </div>
          <span className="text-[11px] text-slate-400">Pairwise mean</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Lowest Pair Score</span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {group.lowestPairScore !== null && group.lowestPairScore !== undefined
              ? `${group.lowestPairScore}%`
              : "N/A"}
          </div>
          <span className="text-[11px] text-slate-400">Bottleneck score</span>
        </Card>

        <Card className="p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Engine Version</span>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
            {group.engineVersion || "1.0"}
          </div>
          <span className="text-[11px] text-slate-400">Pure module build</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Members List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
            Members Roster ({group.members?.length || 0} of {group.targetSize})
          </h2>

          <div className="space-y-3">
            {group.members?.map((m) => {
              const u = m.user || {};
              const isGroupLeader = u._id?.toString() === leaderId;

              return (
                <Card
                  key={u._id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <Avatar name={u.name} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                          {u.name}
                        </span>
                        {isGroupLeader && (
                          <Badge variant="warning" size="xs">
                            ðŸ‘‘ Leader
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {u.registrationNumber || "No Reg"} • {u.email}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        {u.course || "No Course"} • {u.department || "General"} {u.year ? `• Year ${u.year}` : ""}
                      </p>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                        Joined: {new Date(m.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions for member */}
                  <div className="flex sm:flex-col items-end gap-2 shrink-0">
                    <Link
                      href="/admin/students"
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
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
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove from Group
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Empty Seats Visualizer */}
          {group.members?.length < group.targetSize && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/40">
              <span className="text-2xl text-slate-400">ðŸ›ï¸</span>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2 font-heading">
                {group.targetSize - group.members.length} Unfilled Bed(s) Remaining
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Group status is currently <span className="font-semibold text-indigo-600 dark:text-indigo-400">forming</span>.
              </p>
            </div>
          )}

          {/* Join Requests Panel */}
          {group.joinRequests && group.joinRequests.length > 0 && (
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                Join Requests ({group.joinRequests.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {group.joinRequests.map((req) => (
                  <div key={req._id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {req.student?.name || "Candidate"}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono block">
                        Status: {req.status} • Sent: {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {req.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleAdminCancelRequest(req._id)}
                        isLoading={cancellingReqId === req._id}
                        className="text-rose-600 dark:text-rose-400"
                      >
                        Cancel Request
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Pairwise Scores Diagnostics & Room Preferences (1 Col) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Room Preferences Diagnostics */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                Room Preferences
              </h2>
              {group.preferencesNeedReview ? (
                <Badge variant="warning" size="xs">
                  Review Required
                </Badge>
              ) : (
                <Badge variant="success" size="xs">
                  Validated
                </Badge>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-semibold block text-[11px] uppercase tracking-wider mb-1.5">
                  Preferred Hostels (Priority Order):
                </span>
                {group.roomPreferences?.preferredHostels?.length > 0 ? (
                  <div className="space-y-1.5">
                    {group.roomPreferences.preferredHostels.map((h, idx) => (
                      <div
                        key={h._id || idx}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{h.name || "Hostel"}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{h.code}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No specific hostel priority selected</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                    AC Preference:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 capitalize mt-0.5 block">
                    {group.roomPreferences?.acType || "no-preference"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                    Floor Preference:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 capitalize mt-0.5 block">
                    {group.roomPreferences?.floorPreference || "any"} floor
                  </span>
                </div>
              </div>

              {group.roomPreferences?.updatedAt && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  Last updated: {new Date(group.roomPreferences.updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </Card>

          {/* Pairwise Compatibility */}
          <Card className="p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading border-b border-slate-100 dark:border-slate-800 pb-3">
              Pairwise Compatibility Matrix
            </h2>

            {!group.pairScores || group.pairScores.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                Need at least 2 members to evaluate pairwise compatibility scores.
              </p>
            ) : (
              <div className="space-y-3">
                {group.pairScores.map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                        {pair.memberA} &amp; {pair.memberB}
                      </span>
                      <StatusBadge type="score" score={pair.score} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Label: {pair.label || "Matched"}</span>
                      {pair.excluded ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">Deal-breaker alert</span>
                      ) : (
                        <span className="font-medium text-teal-600 dark:text-teal-400">Compatible</span>
                      )}
                    </div>

                    {pair.violations && pair.violations.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px] text-rose-600 dark:text-rose-400">
                        {pair.violations.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Remove Member Dialog */}
      <ConfirmDialog
        isOpen={isRemoveOpen}
        onClose={() => {
          setIsRemoveOpen(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleConfirmRemove}
        title={`Remove ${memberToRemove?.user?.name || "Member"}?`}
        message={`Are you sure you want to administratively remove ${memberToRemove?.user?.name} from this roommate group? The group's target size will remain ${group.targetSize}, and a slot will open.`}
        confirmText="Remove Member"
        variant="danger"
        isLoading={removing}
      />

      {/* Disband Group Dialog */}
      <ConfirmDialog
        isOpen={isDisbandOpen}
        onClose={() => setIsDisbandOpen(false)}
        onConfirm={handleConfirmDisband}
        title="Disband Roommate Group?"
        message="Are you sure you want to administratively disband this group? All active members will be released and returned to the individual candidate pool."
        confirmText="Disband Group"
        variant="danger"
        isLoading={disbanding}
      />

      {/* Release Room Dialog */}
      <ConfirmDialog
        isOpen={isReleaseRoomOpen}
        onClose={() => setIsReleaseRoomOpen(false)}
        onConfirm={handleConfirmReleaseRoom}
        title="Release FCFS Selected Room?"
        message="Are you sure you want to administratively release this group's claimed room? The room will immediately become available for other groups to select."
        confirmText="Release Room"
        variant="danger"
        isLoading={releasingRoom}
      />
    </PageContainer>
  );
}
