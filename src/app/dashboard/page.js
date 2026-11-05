"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  Badge,
  ProgressBar,
  Alert,
  PageTransition,
  Reveal,
  Stepper,
  Button,
  IconBuilding,
  IconBed,
  IconUsers,
  IconSliders,
  IconBell,
  IconSparkles,
  IconShield,
  IconCheck,
  IconArrowRight,
} from "@/components/ui";

export default function StudentDashboard() {
  useDocumentTitle("Dashboard");
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState({
    profileCompleted: false,
    preferencesCompleted: false,
    percentage: 0,
  });
  const [groupInfo, setGroupInfo] = useState(null);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [joinRequestCounts, setJoinRequestCounts] = useState({ pendingSent: 0, pendingIncoming: 0 });
  const [allocation, setAllocation] = useState(null);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const loadData = async () => {
    try {
      setLoadingStatus(true);
      setError(null);
      const [statusRes, groupRes, invRes, allocRes, notifRes, countRes] = await Promise.all([
        axios.get("/api/students/me/status"),
        axios.get("/api/groups/me").catch(() => ({ data: { data: null } })),
        axios.get("/api/invitations/me").catch(() => ({ data: { data: null } })),
        axios.get("/api/allocation/me").catch(() => ({ data: { data: null } })),
        axios.get("/api/notifications?limit=3").catch(() => ({ data: { data: null } })),
        axios.get("/api/join-requests/counts").catch(() => ({ data: { data: null } })),
      ]);
      if (statusRes.data?.data) setStatus(statusRes.data.data);
      if (groupRes.data?.data) setGroupInfo(groupRes.data.data);
      if (invRes.data?.data?.pending) setPendingInvitesCount(invRes.data.data.pending.length);
      if (allocRes.data?.data) setAllocation(allocRes.data.data);
      if (notifRes.data?.data?.notifications) setRecentNotifications(notifRes.data.data.notifications);
      if (countRes.data?.data) setJoinRequestCounts(countRes.data.data);
    } catch (err) {
      console.error("Failed to load student status:", err);
      setError(err.response?.data?.message || err.message || "Failed to load dashboard data. Please try again.");
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasIncompleteSteps = !status.profileCompleted || !status.preferencesCompleted;
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";

  // Determine Current Step in Journey
  const currentStep = !status.profileCompleted
    ? 0
    : !status.preferencesCompleted
    ? 1
    : !groupInfo
    ? 2
    : allocation?.status !== "allocated"
    ? 3
    : 4;

  const journeySteps = [
    { title: "Profile", href: "/dashboard/profile" },
    { title: "Preferences", href: "/dashboard/preferences" },
    { title: "Matches", href: "/dashboard/matches" },
    { title: "Group", href: "/dashboard/group" },
    { title: "Room", href: "/dashboard/room" },
  ];

  return (
    <PageTransition>
      <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
        
        {/* Incomplete Checklist Alert */}
        {error && (
          <Reveal direction="down">
            <Alert
              variant="danger"
              title="Connection Error"
              action={
                <Button variant="outline" size="sm" onClick={loadData}>
                  Try again
                </Button>
              }
            >
              {error}
            </Alert>
          </Reveal>
        )}

        {!loadingStatus && hasIncompleteSteps && (
          <Reveal direction="down">
            <Alert
              variant="warning"
              title="Action Required: Complete Your Roommate Matching Profile"
              action={
                <div className="flex items-center gap-2 flex-wrap">
                  {!status.profileCompleted && (
                    <Link href="/dashboard/profile">
                      <Button variant="secondary" size="sm">
                        Complete Profile &rarr;
                      </Button>
                    </Link>
                  )}
                  {!status.preferencesCompleted && (
                    <Link href="/dashboard/preferences">
                      <Button variant="primary" size="sm">
                        Fill Questionnaire &rarr;
                      </Button>
                    </Link>
                  )}
                </div>
              }
            >
              Before the automated roommate allocation run begins, ensure both your personal academic profile and
              lifestyle questionnaire are confirmed. Incomplete profiles cannot be prioritized for preferred room types.
            </Alert>
          </Reveal>
        )}

        {/* Room Allocated Highlight Banner */}
        {allocation?.status === "allocated" && (
          <Reveal direction="down">
            <Alert
              variant="success"
              title={`Room Allocation Published: Room #${allocation.room?.roomNumber} (${allocation.hostel?.name})`}
              action={
                <Link href="/dashboard/room">
                  <Button variant="success" size="sm">
                    View My Room &rarr;
                  </Button>
                </Link>
              }
            >
              Your hostel room has been officially allocated. View room specifications and connect with your assigned roommates.
            </Alert>
          </Reveal>
        )}

        {/* Welcome Header Hero */}
        <Reveal direction="up">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/20">
            {/* Subtle radial backdrop glows */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-10 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-semibold text-indigo-200 border border-white/10 mb-3">
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                  Student Portal
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-heading">
                  Welcome, {firstName}!
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-indigo-100/90 max-w-xl leading-relaxed">
                  Track your residential journey, configure lifestyle preferences, and explore matching roommate groups.
                </p>
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0">
                <div className="rounded-xl bg-white/10 border border-white/15 px-3.5 py-2 backdrop-blur-md text-left md:text-right">
                  <span className="block text-[11px] uppercase font-bold tracking-wider text-indigo-200">
                    Registration No
                  </span>
                  <span className="text-sm font-mono font-bold text-white">
                    {user?.registrationNumber || "N/A"}
                  </span>
                </div>
                <Link href="/dashboard/hostels">
                  <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white text-indigo-900 border-white/20">
                    <IconBuilding className="w-4 h-4 mr-1 text-indigo-600" /> Browse Hostels
                  </Button>
                </Link>
              </div>
            </div>

            {/* "Your Journey" Stepper */}
            <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 mb-3 block">
                Your Housing Journey
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                {journeySteps.map((s, idx) => {
                  const isDone = idx < currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <Link
                      key={s.title}
                      href={s.href}
                      className={`group flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                        isDone
                          ? "bg-teal-500/15 border-teal-400/30 text-teal-200 hover:bg-teal-500/25"
                          : isCurrent
                          ? "bg-white/20 border-white/40 text-white shadow-sm hover:bg-white/25"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isDone
                            ? "bg-teal-500 text-white"
                            : isCurrent
                            ? "bg-indigo-600 text-white shadow-sm ring-2 ring-white/50"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {isDone ? "" : idx + 1}
                      </span>
                      <span className="text-xs font-semibold truncate group-hover:underline">
                        {s.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Readiness Progress Strip */}
        <Reveal direction="up" delay={100}>
          <Card className="border border-slate-200/90 dark:border-slate-800">
            <CardBody className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
                    Roommate Matching Readiness
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Combined profile completeness and lifestyle questionnaire progress
                  </p>
                </div>
                <Badge variant={status.percentage === 100 ? "success" : "brand"} size="md">
                  {loadingStatus ? "Calculating..." : `${status.percentage}% Ready`}
                </Badge>
              </div>

              <ProgressBar
                value={status.percentage}
                max={100}
                color={status.percentage === 100 ? "success" : "brand"}
                animated
              />

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {status.profileCompleted ? "" : "â³"}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Student Profile</span>
                  </div>
                  <Link href="/dashboard/profile" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                    {status.profileCompleted ? "Review &rarr;" : "Complete &rarr;"}
                  </Link>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {status.preferencesCompleted ? "" : "â³"}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Lifestyle Questionnaire</span>
                  </div>
                  <Link href="/dashboard/preferences" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                    {status.preferencesCompleted ? "Review &rarr;" : "Fill Questionnaire &rarr;"}
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        </Reveal>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Left Column: Profile Summary & Notifications */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profile Overview Card */}
            <Reveal direction="up" delay={150}>
              <Card variant="default">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm">Profile Overview</CardTitle>
                  <Badge variant={status.profileCompleted ? "success" : "warning"} size="sm">
                    {status.profileCompleted ? "Complete" : "Incomplete"}
                  </Badge>
                </CardHeader>
                <CardBody className="p-4 sm:p-5">
                  <dl className="space-y-3 text-xs sm:text-sm">
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                        Full Name
                      </dt>
                      <dd className="text-slate-900 dark:text-slate-100 font-semibold mt-0.5">
                        {user?.name || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                        Institutional Email
                      </dt>
                      <dd className="text-slate-900 dark:text-slate-100 font-semibold mt-0.5 break-all">
                        {user?.email || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                        Gender
                      </dt>
                      <dd className="text-slate-900 dark:text-slate-100 font-semibold capitalize mt-0.5">
                        {user?.gender || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                        Course & Department
                      </dt>
                      <dd className="text-slate-900 dark:text-slate-100 font-semibold mt-0.5">
                        {[user?.course, user?.department].filter(Boolean).join(" • ") || "Not specified"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                        Academic Year
                      </dt>
                      <dd className="text-slate-900 dark:text-slate-100 font-semibold mt-0.5">
                        {user?.year ? `Year ${user.year}` : "Not specified"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Link href="/dashboard/profile">
                      <Button variant="secondary" size="sm" className="w-full">
                         Edit Profile Details
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </Reveal>

            {/* Recent Notifications Card */}
            <Reveal direction="up" delay={200}>
              <Card variant="default">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <IconBell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <CardTitle className="text-sm">Recent Notifications</CardTitle>
                  </div>
                  <Link
                    href="/dashboard/notifications"
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View all &rarr;
                  </Link>
                </CardHeader>
                <CardBody className="p-3 sm:p-4">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentNotifications.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-xs text-slate-400">No new notifications</p>
                      </div>
                    ) : (
                      recentNotifications.map((notif) => (
                        <Link
                          key={notif._id}
                          href={notif.link || "/dashboard/notifications"}
                          className="block py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors group"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                              {notif.title}
                            </span>
                            {!notif.readAt && (
                              <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {notif.message}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </CardBody>
              </Card>
            </Reveal>
          </div>

          {/* Right Column: Portal Feature Cards */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">
            
            {/* Card: Hostels */}
            <Reveal direction="up" delay={150}>
              <Link href="/dashboard/hostels" className="block">
                <Card variant="interactive" className="p-5 sm:p-6 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <IconBuilding className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Browse Eligible Hostels
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          View campus hostels you qualify for, inspect facilities, rules, and real-time available beds.
                        </p>
                      </div>
                    </div>
                    <Badge variant="success" size="sm">Active</Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>Explore residential accommodations</span>
                    <span className="group-hover:translate-x-1 transition-transform">Open &rarr;</span>
                  </div>
                </Card>
              </Link>
            </Reveal>

            {/* Card: Lifestyle Preferences */}
            <Reveal direction="up" delay={200}>
              <Link href="/dashboard/preferences" className="block">
                <Card variant="interactive" className="p-5 sm:p-6 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <IconSliders className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          My Lifestyle Preferences
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Define sleep schedules, study habits, desired room size, dietary tolerances, and deal-breakers.
                        </p>
                      </div>
                    </div>
                    <Badge variant={status.preferencesCompleted ? "success" : "warning"} size="sm">
                      {status.preferencesCompleted ? " Completed" : "Pending"}
                    </Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>{status.preferencesCompleted ? "Review or update questionnaire" : "Answer questionnaire"}</span>
                    <span className="group-hover:translate-x-1 transition-transform">{status.preferencesCompleted ? "Edit &rarr;" : "Start &rarr;"}</span>
                  </div>
                </Card>
              </Link>
            </Reveal>

            {/* Card: Roommate Matches */}
            <Reveal direction="up" delay={250}>
              <Link href="/dashboard/matches" className="block">
                <Card variant="interactive" className="p-5 sm:p-6 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <IconSparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Roommate Matches & Open Groups
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Explore compatible roommate peers calculated from your lifestyle and browse forming groups.
                        </p>
                      </div>
                    </div>
                    <Badge variant="brand" size="sm">Matching Engine</Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>{status.preferencesCompleted ? "Browse compatible peers and groups" : "Complete preferences to unlock"}</span>
                    <span className="group-hover:translate-x-1 transition-transform">Explore &rarr;</span>
                  </div>
                </Card>
              </Link>
            </Reveal>

            {/* Card: Roommate Group */}
            <Reveal direction="up" delay={300}>
              <Card variant="interactive" className="p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <IconUsers className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                          Roommate Group
                        </h3>
                        {groupInfo && (
                          <Badge
                            variant={
                              groupInfo.status === "complete"
                                ? "success"
                                : groupInfo.status === "locked"
                                ? "brand"
                                : "info"
                            }
                            size="sm"
                          >
                            {groupInfo.status.toUpperCase()} ({groupInfo.seatsFilled}/{groupInfo.targetSize})
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {groupInfo
                          ? groupInfo.isLeader
                            ? `You are the group leader (${groupInfo.seatsFilled}/${groupInfo.targetSize} beds filled).`
                            : `You are a member of this ${groupInfo.targetSize}-bed group.`
                          : "Form a custom group with matched peers or select a room."}
                      </p>
                    </div>
                  </div>

                  {pendingInvitesCount > 0 && (
                    <Link href="/dashboard/invitations">
                      <Badge variant="warning" size="sm" pulse>
                         {pendingInvitesCount} Invite{pendingInvitesCount > 1 ? "s" : ""}
                      </Badge>
                    </Link>
                  )}
                </div>

                {/* Seat Visualization Dots */}
                {groupInfo && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Seats:</span>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: groupInfo.targetSize || 2 }).map((_, idx) => (
                        <span
                          key={idx}
                          className={`w-3.5 h-3.5 rounded-full border transition-all ${
                            idx < (groupInfo.seatsFilled || 1)
                              ? "bg-teal-500 border-teal-600 shadow-xs"
                              : "bg-slate-200 dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-700"
                          }`}
                          title={idx < (groupInfo.seatsFilled || 1) ? `Seat #${idx + 1} filled` : `Seat #${idx + 1} open`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupInfo ? (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-600 dark:text-slate-400">
                        {groupInfo.averageScore ? `Average Compatibility: ${groupInfo.averageScore}%` : "Group Active"}
                      </span>
                      {joinRequestCounts.pendingIncoming > 0 && groupInfo.isLeader && (
                        <Link href="/dashboard/group">
                          <Badge variant="warning" size="sm" pulse>
                            ðŸ“© {joinRequestCounts.pendingIncoming} Pending Join Request{joinRequestCounts.pendingIncoming === 1 ? "" : "s"}
                          </Badge>
                        </Link>
                      )}
                    </div>
                    <Link href="/dashboard/group" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      Manage Group &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">No active group</span>
                    <div className="flex items-center gap-3">
                      {pendingInvitesCount > 0 && (
                        <Link href="/dashboard/invitations" className="text-amber-700 dark:text-amber-400 hover:underline">
                          View Invitations ({pendingInvitesCount})
                        </Link>
                      )}
                      <Link href="/dashboard/group" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        Create or Join &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </Card>
            </Reveal>

            {/* Card: Choose Room (FCFS) */}
            <Reveal direction="up" delay={350}>
              <Link href="/dashboard/rooms" className="block">
                <Card variant="interactive" className="p-5 sm:p-6 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <IconBed className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Choose Room (FCFS Window)
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          First-come, first-served room selection window. Pick and claim your preferred room in real time.
                        </p>
                      </div>
                    </div>
                    <Badge variant="brand" size="sm">Selection</Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>Browse available rooms and claim</span>
                    <span className="group-hover:translate-x-1 transition-transform">Select Room &rarr;</span>
                  </div>
                </Card>
              </Link>
            </Reveal>

            {/* Card: My Room */}
            <Reveal direction="up" delay={400}>
              <Link href="/dashboard/room" className="block">
                <Card variant="interactive" className="p-5 sm:p-6 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <IconShield className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          My Room
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {allocation?.status === "allocated"
                            ? `Room #${allocation.room?.roomNumber} assigned in ${allocation.hostel?.name}`
                            : allocation?.status === "waitlisted"
                            ? "You are currently placed on the room waitlist."
                            : "Inspect room residency, assigned roommates, and hostel facilities."}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        allocation?.status === "allocated"
                          ? "success"
                          : allocation?.status === "waitlisted"
                          ? "warning"
                          : "info"
                      }
                      size="sm"
                    >
                      {allocation?.status === "allocated"
                        ? " ALLOCATED"
                        : allocation?.status === "waitlisted"
                        ? "WAITLISTED"
                        : "PENDING"}
                    </Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>
                      {allocation?.status === "allocated"
                        ? "View room & roommate details"
                        : "Check allocation status"}
                    </span>
                    <span className="group-hover:translate-x-1 transition-transform">Open &rarr;</span>
                  </div>
                </Card>
              </Link>
            </Reveal>

          </div>
        </div>
      </div>
    </PageTransition>
  );
}
