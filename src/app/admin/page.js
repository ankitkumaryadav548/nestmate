"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const res = await axios.get("/api/admin/stats");
        if (res.data?.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load admin stats:", err);
        setError("Could not load real-time statistics.");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const totals = stats?.totals || {
    hostels: 0,
    rooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    roomsInMaintenance: 0,
    studentsRegistered: 0,
  };

  const statCards = [
    {
      label: "Total Hostels",
      value: totals.hostels,
      icon: "🏢",
      color: "bg-blue-50 text-blue-700 border-blue-200",
      link: "/admin/hostels",
    },
    {
      label: "Total Rooms",
      value: totals.rooms,
      icon: "🚪",
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      link: "/admin/rooms",
    },
    {
      label: "Available Beds",
      value: totals.availableBeds,
      icon: "🛏️",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      subtext: `${totals.occupiedBeds} occupied / ${totals.totalBeds} total`,
    },
    {
      label: "Students Registered",
      value: totals.studentsRegistered,
      icon: "🎓",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
  ];

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Admin Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 p-8 text-white shadow-xl shadow-purple-950/20 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-semibold text-purple-200 border border-purple-400/20 mb-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Institutional Administration Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.name || "Administrator"}
            </h1>
            <p className="mt-1 text-sm text-purple-100 max-w-xl">
              Centralized command center for managing residential hostels, student applications, and allocation rules.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-col gap-2">
            <Link
              href="/admin/hostels/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-900 shadow-md hover:bg-purple-50 transition-all"
            >
              + Add New Hostel
            </Link>
            <Link
              href="/admin/rooms"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all"
            >
              Manage Rooms
            </Link>
          </div>
        </div>
      </div>

      {/* Live System Stat Cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Live Inventory Metrics</h2>
          {loading && (
            <span className="text-xs text-indigo-600 animate-pulse">
              Refreshing metrics...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Content = (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm ${stat.color}`}
                  >
                    {stat.icon}
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {loading ? "..." : stat.value}
                </div>
                {stat.subtext ? (
                  <p className="text-[11px] text-slate-500 mt-1">{stat.subtext}</p>
                ) : stat.link ? (
                  <p className="text-[11px] text-indigo-600 font-semibold mt-1">
                    Manage &rarr;
                  </p>
                ) : null}
              </div>
            );

            return stat.link ? (
              <Link href={stat.link} key={stat.label} className="block">
                {Content}
              </Link>
            ) : (
              <div key={stat.label}>{Content}</div>
            );
          })}
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">System Modules</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Access core administrative modules and configure allocation controls.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Hostels - LIVE */}
        <Link
          href="/admin/hostels"
          className="group flex flex-col justify-between rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl border border-indigo-100 group-hover:scale-105 transition-transform">
                🏢
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                Active Module
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Hostels
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Configure campus hostels, blocks, wings, eligibility criteria, and facilities.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-indigo-600 flex items-center justify-between">
            <span>{totals.hostels} Hostels Configured</span>
            <span>&rarr;</span>
          </div>
        </Link>

        {/* Rooms - LIVE */}
        <Link
          href="/admin/rooms"
          className="group flex flex-col justify-between rounded-2xl border border-blue-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-500 transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl border border-blue-100 group-hover:scale-105 transition-transform">
                🚪
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                Active Module
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Rooms
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Manage room inventory, bulk creation, capacities, AC/Non-AC types, and maintenance status.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center justify-between">
            <span>{totals.rooms} Rooms Active</span>
            <span>&rarr;</span>
          </div>
        </Link>

        {/* Students - Coming Soon */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-6 opacity-75">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">
                🎓
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Coming soon
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">Students</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              View registered students, review eligibility, and monitor application status.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-400 font-medium">
            Phase 4: Applicant Management
          </div>
        </div>

        {/* Allocations - Coming Soon */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-6 opacity-75">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">
                📊
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Coming soon
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">Allocations</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Execute algorithmic allocation runs, review roommate pairs, and publish assignments.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-400 font-medium">
            Phase 5: Automated Allocation Engine
          </div>
        </div>
      </div>
    </div>
  );
}
