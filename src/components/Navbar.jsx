"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const { user, loading, logout } = useAuth();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "HostelMatch";

  useEffect(() => {
    if (!user || user.role !== "student") return;

    let isMounted = true;
    const fetchInvitesCount = async () => {
      try {
        const res = await axios.get("/api/invitations/me");
        if (isMounted && res.data?.data?.pending) {
          setPendingInvitesCount(res.data.data.pending.length);
        }
      } catch {
        // silently ignore
      }
    };

    fetchInvitesCount();
    const interval = setInterval(fetchInvitesCount, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 transition-transform group-hover:scale-105">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              {appName}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-600 -mt-1 hidden sm:block">
              Hostel Allocation System
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-5">
          {user && (
            <>
              <Link
                href={user.role === "admin" ? "/admin" : "/dashboard"}
                className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
              >
                {user.role === "admin" ? "Admin Console" : "Dashboard"}
              </Link>
              {user.role === "admin" ? (
                <>
                  <Link
                    href="/admin/hostels"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Hostels
                  </Link>
                  <Link
                    href="/admin/rooms"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Rooms
                  </Link>
                  <Link
                    href="/admin/students"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Students
                  </Link>
                  <Link
                    href="/admin/matching"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Matching
                  </Link>
                  <Link
                    href="/admin/groups"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Groups
                  </Link>
                  <Link
                    href="/admin/demand"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Demand
                  </Link>
                  <Link
                    href="/admin/allocations"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Allocations
                  </Link>
                  <Link
                    href="/admin/integrity"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Integrity
                  </Link>
                  <Link
                    href="/admin/announcements"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Announcements
                  </Link>
                  <Link
                    href="/admin/notifications"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Notifications
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard/room"
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    My Room
                  </Link>
                  <Link
                    href="/dashboard/hostels"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Hostels
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/preferences"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Preferences
                  </Link>
                  <Link
                    href="/dashboard/matches"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Matches
                  </Link>
                  <Link
                    href="/dashboard/group"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Group
                  </Link>
                  <Link
                    href="/dashboard/invitations"
                    className="relative text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Invitations</span>
                    {pendingInvitesCount > 0 && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-amber-500 rounded-full animate-pulse">
                        {pendingInvitesCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/dashboard/notifications"
                    className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Notifications
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* Desktop Auth Controls */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <NotificationBell userRole={user.role} />

              {/* User details & badge */}
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      user.role === "admin"
                        ? "text-purple-600"
                        : "text-indigo-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-all"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Actions: Bell & Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {user && <NotificationBell userRole={user.role} />}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 px-4 pt-2 pb-6 space-y-3 backdrop-blur-md">
          <div className="space-y-1">
            {user ? (
              <Link
                href={user.role === "admin" ? "/admin" : "/dashboard"}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                {user.role === "admin" ? "Admin Console" : "Dashboard"}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-base font-medium text-slate-900 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-base font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Create Account
                </Link>
              </>
            )}
            {user && (
              <>
                {user.role === "admin" ? (
                  <>
                    <Link
                      href="/admin/hostels"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Hostels
                    </Link>
                    <Link
                      href="/admin/rooms"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Rooms
                    </Link>
                    <Link
                      href="/admin/students"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Students
                    </Link>
                    <Link
                      href="/admin/matching"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Matching
                    </Link>
                    <Link
                      href="/admin/groups"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Groups
                    </Link>
                    <Link
                      href="/admin/demand"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Demand Analytics
                    </Link>
                    <Link
                      href="/admin/allocations"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Allocations
                    </Link>
                    <Link
                      href="/admin/integrity"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Integrity Diagnostic
                    </Link>
                    <Link
                      href="/admin/announcements"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Announcements
                    </Link>
                    <Link
                      href="/admin/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Notifications
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard/room"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-bold text-indigo-600 hover:bg-indigo-50"
                    >
                      My Room
                    </Link>
                    <Link
                      href="/dashboard/hostels"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Hostels
                    </Link>
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/dashboard/preferences"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Preferences
                    </Link>
                    <Link
                      href="/dashboard/matches"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Matches
                    </Link>
                    <Link
                      href="/dashboard/group"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Group
                    </Link>
                    <Link
                      href="/dashboard/invitations"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <span>Invitations</span>
                      {pendingInvitesCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-amber-500 rounded-full">
                          {pendingInvitesCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/dashboard/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Notifications
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{user.name}</span>
                    <span className="text-xs text-slate-500">{user.email}</span>
                    <span className="inline-block mt-0.5 text-[10px] font-semibold uppercase text-indigo-600">
                      Role: {user.role}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-center rounded-lg border border-rose-200 bg-rose-50 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
