"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

export default function Home() {
  const [healthStatus, setHealthStatus] = useState({
    loading: true,
    connected: false,
    database: "disconnected",
    message: "",
    timestamp: null,
    error: null,
  });

  const checkHealth = async () => {
    setHealthStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.get("/health");
      if (response.data && response.data.success) {
        setHealthStatus({
          loading: false,
          connected: true,
          database: response.data.database,
          message: response.data.message || "HostelMatch API running",
          timestamp: response.data.time,
          error: null,
        });
      } else {
        setHealthStatus({
          loading: false,
          connected: false,
          database: "disconnected",
          message: response.data?.message || "Unexpected response format",
          timestamp: new Date().toISOString(),
          error: "API returned unexpected response",
        });
      }
    } catch (err) {
      setHealthStatus({
        loading: false,
        connected: false,
        database: "disconnected",
        message: "Failed to connect to backend service",
        timestamp: new Date().toISOString(),
        error: err.message || "Network error",
      });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 px-4 py-1.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200/50 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
              Universal University Platform
            </div>

            {/* Main Title */}
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
              <span className="block bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-800 bg-clip-text text-transparent">
                HostelMatch
              </span>
            </h1>

            {/* Tagline */}
            <p className="mt-4 text-xl font-semibold text-slate-800 sm:text-2xl">
              Smart hostel allocation and roommate matching
            </p>

            {/* Sub-description */}
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              A configurable and modular system designed to automate student room assignments, streamline hostel administration, and match compatible roommates for any college or university.
            </p>

            {/* Status Card (Calls /api/health on load) */}
            <div className="mt-10 mx-auto max-w-lg">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 transition-all">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">System Diagnostics</span>
                    <span className="text-xs text-slate-400 font-mono">/api/health</span>
                  </div>
                  <button
                    onClick={checkHealth}
                    disabled={healthStatus.loading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50"
                    title="Re-check health endpoint"
                  >
                    <svg
                      className={`h-3.5 w-3.5 ${healthStatus.loading ? "animate-spin" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Backend Status State */}
                  {healthStatus.loading ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent mb-3"></div>
                      <p className="text-sm font-medium text-slate-600">Connecting to HostelMatch API...</p>
                      <p className="text-xs text-slate-400 mt-1">Verifying backend & database connectivity</p>
                    </div>
                  ) : healthStatus.connected ? (
                    <div className="space-y-3">
                      {/* Backend Connected Indicator (Green) */}
                      <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                          <span className="text-sm font-bold text-emerald-800">
                            Backend connected
                          </span>
                        </div>
                        <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          HTTP 200 OK
                        </span>
                      </div>

                      {/* Database Status Row */}
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs">
                        <span className="font-medium text-slate-600">MongoDB Database:</span>
                        {healthStatus.database === "connected" ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                            connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                            disconnected
                          </span>
                        )}
                      </div>

                      {/* Info / Note */}
                      <div className="text-left text-xs text-slate-500 pt-1">
                        {healthStatus.database === "disconnected" ? (
                          <p className="rounded-lg bg-amber-50 border border-amber-200/60 p-2.5 text-amber-800 text-[11px] leading-relaxed">
                            💡 <strong>Tip:</strong> Paste your MongoDB Atlas URI into <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">.env.local</code> to connect your database.
                          </p>
                        ) : (
                          <p className="text-emerald-700 text-[11px]">
                            ✓ MongoDB Atlas is connected and ready.
                          </p>
                        )}
                        {healthStatus.timestamp && (
                          <p className="mt-2 text-slate-400 font-mono text-[10px]">
                            Server Time: {new Date(healthStatus.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Backend Not Reachable Indicator (Red) */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200/80 p-3.5">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-3 w-3">
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                          </span>
                          <span className="text-sm font-bold text-rose-800">
                            Backend not reachable
                          </span>
                        </div>
                        <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                          Unavailable
                        </span>
                      </div>
                      <p className="text-xs text-rose-700 text-left bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                        Could not reach <code className="font-mono">/api/health</code>. Please make sure the Next.js development server is running via <code className="font-mono font-bold">npm run dev</code>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Architecture Overview
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Configurable for Any Campus
            </p>
            <p className="mt-3 text-sm text-slate-600">
              HostelMatch foundation is designed to decouple institution-specific business logic into generic, modular configuration schemas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold mb-4">
                🏛️
              </div>
              <h3 className="text-base font-semibold text-slate-900">Configurable Hierarchy</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Campus-agnostic schema for campuses, blocks, floors, and room types (single, double, triple, dorm) adaptable to any university rules.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold mb-4">
                🤝
              </div>
              <h3 className="text-base font-semibold text-slate-900">Roommate Matching Engine</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Future-ready services layer prepared for multi-criteria compatibility scoring based on sleep schedules, study habits, and preferences.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 font-bold mb-4">
                ⚡
              </div>
              <h3 className="text-base font-semibold text-slate-900">Automated Allocation</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                REST route handlers with Zod schema validation, Mongoose transaction safety, and role-based guards for students, wardens, and admins.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
