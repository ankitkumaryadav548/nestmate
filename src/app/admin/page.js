"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import {
  PageContainer,
  Card,
  CardBody,
  Badge,
  AnimatedNumber,
  Button,
  Reveal,
  Skeleton,
} from "@/components/ui";
import {
  AdminPageHeader,
  StatusBadge,
  StackedBar,
  HorizontalBars,
} from "@/components/admin";

export default function AdminPage() {
  useDocumentTitle("Command Centre", true);
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [announcementsInfo, setAnnouncementsInfo] = useState({ total: 0, lastSent: null });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, annRes] = await Promise.all([
        axios.get("/api/admin/stats"),
        axios.get("/api/admin/announcements?limit=1").catch(() => ({ data: { data: null } })),
      ]);
      if (res.data?.success) {
        setStats(res.data.data);
      }
      if (annRes.data?.success && annRes.data.data) {
        const list = annRes.data.data.announcements || [];
        setAnnouncementsInfo({
          total: annRes.data.data.total || 0,
          lastSent: list.length > 0 ? list[0] : null,
        });
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
      setError("Could not load real-time statistics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totals = stats?.totals || {
    hostels: 0,
    rooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    reservedBeds: 0,
    availableBeds: 0,
    roomsInMaintenance: 0,
    studentsRegistered: 0,
    studentsWithCompletedPreferences: 0,
    studentsAllocated: 0,
    studentsUnallocated: 0,
    publishedRunsCount: 0,
    draftRunsCount: 0,
  };

  const groupData = stats?.groups || {
    forming: 0,
    complete: 0,
    locked: 0,
    pendingJoinRequests: 0,
    studentsInGroups: 0,
    studentsInAutoPool: 0,
  };

  // Bed Distribution Segments for StackedBar
  const bedSegments = [
    {
      label: "Occupied",
      value: totals.occupiedBeds || 0,
      color: "bg-indigo-600 dark:bg-indigo-500",
      displayValue: `${totals.occupiedBeds || 0} beds`,
    },
    {
      label: "Reserved (Claimed)",
      value: totals.reservedBeds || 0,
      color: "bg-amber-500 dark:bg-amber-400",
      displayValue: `${totals.reservedBeds || 0} beds`,
    },
    {
      label: "Available",
      value: totals.availableBeds || 0,
      color: "bg-teal-500 dark:bg-teal-400",
      displayValue: `${totals.availableBeds || 0} beds`,
    },
  ];

  // Hostel Breakdown for HorizontalBars
  const hostelBars = (stats?.breakdown || []).slice(0, 6).map((h) => ({
    label: `${h.code} (${h.name})`,
    value: h.occupiedBeds || 0,
    max: h.totalBeds || 1,
    displayValue: `${h.occupiedBeds || 0} / ${h.totalBeds || 0}`,
    color:
      (h.occupiedBeds || 0) >= (h.totalBeds || 1)
        ? "bg-indigo-600 dark:bg-indigo-500"
        : (h.occupiedBeds || 0) > 0
        ? "bg-teal-600 dark:bg-teal-500"
        : "bg-slate-300 dark:bg-slate-700",
  }));

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      {/* Admin Welcome Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 mb-8 border border-indigo-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-semibold text-indigo-200 border border-indigo-400/20 mb-3">
              <span className="h-2 w-2 rounded-full bg-teal-400 motion-safe:animate-pulse" />
              <span>System Operational &amp; Healthy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
              Welcome, {user?.name || "Administrator"}
            </h1>
            <p className="mt-1.5 text-sm text-indigo-100 max-w-xl leading-relaxed">
              Institutional command center for residential allocations, student compatibility matching, selection windows, and governance.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-stretch sm:self-auto shrink-0">
            <Link href="/admin/hostels/new">
              <Button variant="primary" size="sm" className="bg-white text-indigo-900 hover:bg-indigo-50 border-0 shadow-md">
                + Add Hostel
              </Button>
            </Link>
            <Link href="/admin/rooms">
              <Button variant="secondary" size="sm" className="bg-white/10 text-white hover:bg-white/20 border-white/20">
                Manage Rooms
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8">
          <Alert
            variant="danger"
            title="Data Fetch Error"
            action={
              <Button variant="outline" size="sm" onClick={fetchStats}>
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        </div>
      )}

      {/* Key Inventory Metrics Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
              Live Campus Inventory
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time synchronization across rooms, capacity, and student requests
            </p>
          </div>
          {loading && (
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 motion-safe:animate-pulse">
              Syncing live metrics...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Hostels */}
          <Card className="p-4.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Hostels</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 flex items-center justify-center text-sm">
                🏢
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              <AnimatedNumber value={totals.hostels || 0} />
            </div>
            <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <Link href="/admin/hostels" className="hover:underline">
                View Hostels Directory &rarr;
              </Link>
            </div>
          </Card>

          {/* Room Occupancy */}
          <Card className="p-4.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bed Allocation</span>
              <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-center text-sm">
                🚪
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              <AnimatedNumber value={totals.occupiedBeds || 0} /> / {totals.totalBeds || 0}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {totals.availableBeds || 0} available · {totals.reservedBeds || 0} reserved
            </p>
          </Card>

          {/* Students Registered */}
          <Card className="p-4.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Registered Students</span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40 flex items-center justify-center text-sm">
                👥
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              <AnimatedNumber value={totals.studentsRegistered || 0} />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {totals.studentsWithCompletedPreferences || 0} completed preferences
            </p>
          </Card>

          {/* Groups & Requests */}
          <Card className="p-4.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Roommate Groups</span>
              <div className="h-8 w-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-900/40 flex items-center justify-center text-sm">
                🤝
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              <AnimatedNumber value={groupData.complete || 0} /> <span className="text-sm font-normal text-slate-500">complete</span>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {groupData.forming || 0} forming · {groupData.pendingJoinRequests || 0} join requests
            </p>
          </Card>
        </div>
      </div>

      {/* Bed Distribution & Hostel Utilization Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Overall Bed Usage StackedBar */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                Overall Bed Usage
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Occupied, reserved claims, and vacant beds
              </p>
            </div>
            <Badge variant="brand" size="sm">
              {totals.totalBeds || 0} Total Beds
            </Badge>
          </div>

          <StackedBar
            segments={bedSegments}
            total={totals.totalBeds || 1}
            height="h-5"
            className="my-4"
          />

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Utilization Rate:</span>
            <strong className="text-slate-900 dark:text-slate-100 font-mono">
              {totals.totalBeds
                ? `${Math.round(((totals.occupiedBeds || 0) / totals.totalBeds) * 100)}%`
                : "0%"}
            </strong>
          </div>
        </Card>

        {/* Hostel Occupancy HorizontalBars */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                Hostel Occupancy Sample
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Occupied beds versus capacity across active hostels
              </p>
            </div>
            <Link href="/admin/hostels" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              View All &rarr;
            </Link>
          </div>

          {hostelBars.length > 0 ? (
            <HorizontalBars data={hostelBars} className="my-2" />
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
              No hostel breakdown data available.
            </p>
          )}
        </Card>
      </div>

      {/* Quick Actions Strip */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading mb-3">
          Quick Administrative Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Link href="/admin/allocations" className="block">
            <Card className="p-4 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-lg border border-indigo-100 dark:border-indigo-900/40 group-hover:scale-105 transition-transform">
                  ⚡
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Run Simulation
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Draft &amp; compare matching runs
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/selection" className="block">
            <Card className="p-4 hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 text-lg border border-teal-100 dark:border-teal-900/40 group-hover:scale-105 transition-transform">
                  ⏱️
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    Selection Window
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Control FCFS claim windows
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/announcements" className="block">
            <Card className="p-4 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-lg border border-purple-100 dark:border-purple-900/40 group-hover:scale-105 transition-transform">
                  📢
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Send Announcement
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Broadcast cohort notifications
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/integrity" className="block">
            <Card className="p-4 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-lg border border-emerald-100 dark:border-emerald-900/40 group-hover:scale-105 transition-transform">
                  🛡️
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Check Integrity
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Run database diagnostics
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
          All Management Modules
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Access complete directories and system governance tools
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Hostels */}
        <Link href="/admin/hostels" className="group block">
          <Card className="h-full p-5 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xl border border-indigo-100 dark:border-indigo-900/40 group-hover:scale-105 transition-transform">
                  🏢
                </div>
                <Badge variant="brand" size="sm">Hostels</Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-heading">
                Hostels Directory
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Configure campus hostels, gender assignments, floor counts, and facility offerings.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
              <span>{totals.hostels || 0} Hostels</span>
              <span>&rarr;</span>
            </div>
          </Card>
        </Link>

        {/* Rooms */}
        <Link href="/admin/rooms" className="group block">
          <Card className="h-full p-5 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-xl border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                  🚪
                </div>
                <Badge variant="info" size="sm">Rooms</Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-heading">
                Room Inventory
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Manage room capacities, bulk generation, AC/Non-AC types, and maintenance status.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
              <span>{totals.rooms || 0} Rooms</span>
              <span>&rarr;</span>
            </div>
          </Card>
        </Link>

        {/* Students */}
        <Link href="/admin/students" className="group block">
          <Card className="h-full p-5 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 text-xl border border-purple-100 dark:border-purple-900/40 group-hover:scale-105 transition-transform">
                  🎓
                </div>
                <Badge variant="brand" size="sm">Students</Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors font-heading">
                Students Directory
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Inspect registered students, questionnaires, room sizes, and account statuses.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center justify-between">
              <span>{totals.studentsRegistered || 0} Registered</span>
              <span>&rarr;</span>
            </div>
          </Card>
        </Link>

        {/* Matching */}
        <Link href="/admin/matching" className="group block">
          <Card className="h-full p-5 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xl border border-indigo-100 dark:border-indigo-900/40 group-hover:scale-105 transition-transform">
                  ⚙️
                </div>
                <Badge variant="brand" size="sm">Algorithm</Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-heading">
                Matching Console
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Configure lifestyle algorithm weights, inspect pairwise compatibility, and check deal-breakers.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
              <span>Algorithm Config</span>
              <span>&rarr;</span>
            </div>
          </Card>
        </Link>

        {/* Groups */}
        <Link href="/admin/groups" className="group block">
          <Card className="h-full p-5 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xl border border-indigo-100 dark:border-indigo-900/40 group-hover:scale-105 transition-transform">
                  👥
                </div>
                <Badge variant="warning" size="sm">{groupData.forming || 0} Forming</Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-heading">
                Roommate Groups
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Track forming vs complete groups, inspect compatibility, and manage member requests.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
              <span>{groupData.studentsInGroups || 0} in Groups</span>
              <span>&rarr;</span>
            </div>
          </Card>
        </Link>

        {/* Demand */}
        <Link href="/admin/demand" className="group block">
          <Card className="h-full p-5 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-xl border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform">
                  📈
                </div>
                <Badge variant="info" size="sm">Analytics</Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-heading">
                Demand &amp; Supply
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Analyze student first-choice hostel demand and AC requirements against real capacity.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
              <span>Demand Insights</span>
              <span>&rarr;</span>
            </div>
          </Card>
        </Link>

        {/* Selection */}
        <Link href="/admin/selection" className="group block">
          <Card className="h-full p-5 hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-xl border border-teal-100 dark:border-teal-900/40 group-hover:scale-105 transition-transform">
                  ⏱️
                </div>
                <Badge variant="success" size="sm">FCFS</Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors font-heading">
                Selection Window
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Control first-come first-served claim windows and auto-fill remaining open seats.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center justify-between">
              <span>Manage Window</span>
              <span>&rarr;</span>
            </div>
          </Card>
        </Link>

        {/* Allocations */}
        <Link href="/admin/allocations" className="group block">
          <Card className="h-full p-5 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-xl border border-indigo-100 dark:border-indigo-900/40 group-hover:scale-105 transition-transform">
                  ⚡
                </div>
                <Badge variant="brand" size="sm">
                  {totals.publishedRunsCount || 0} Published
                </Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-heading">
                Allocations Engine
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Multi-round optimization simulations, draft overrides, publishing, and rollback.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
              <span>{totals.draftRunsCount || 0} Drafts</span>
              <span>&rarr;</span>
            </div>
          </Card>
        </Link>
      </div>
    </PageContainer>
  );
}