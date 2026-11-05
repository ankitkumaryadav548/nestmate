"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Avatar from "@/components/ui/Avatar";
import { IconMenu, IconClose, IconLogOut } from "@/components/ui/Icons";
import InfoModal, { openInfoModal } from "@/components/InfoModal";

/**
 * Public & App Navbar
 * Displays translucent sticky header with scroll shadow, logo mark,
 * theme toggle, notification bell, user profile menu, and mobile drawer.
 * Automatically hidden on /dashboard and /admin routes where DashboardShell manages navigation.
 */
export default function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalTab, setInfoModalTab] = useState("how-it-works");

  // Listen for global open-info-modal events
  useEffect(() => {
    const handleOpenModal = (e) => {
      if (e.detail?.tab) {
        setInfoModalTab(e.detail.tab);
        setInfoModalOpen(true);
      }
    };
    window.addEventListener("open-info-modal", handleOpenModal);
    return () => window.removeEventListener("open-info-modal", handleOpenModal);
  }, []);

  const appName = process.env.NEXT_PUBLIC_APP_NAME || "HostelMatch";

  // Check scroll position to add dynamic elevation shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Fetch pending invitations + join requests count
  useEffect(() => {
    if (!user || user.role !== "student") return;

    let isMounted = true;
    const fetchInvitesCount = async () => {
      try {
        const [invRes, countRes] = await Promise.allSettled([
          axios.get("/api/invitations/me"),
          axios.get("/api/join-requests/counts"),
        ]);
        let total = 0;
        if (invRes.status === "fulfilled" && invRes.value?.data?.data?.pending) {
          total += invRes.value.data.data.pending.length;
        }
        if (countRes.status === "fulfilled" && countRes.value?.data?.data) {
          total += countRes.value.data.data.pendingIncoming || 0;
        }
        if (isMounted) {
          setPendingInvitesCount(total);
        }
      } catch {
        // Silently ignore
      }
    };

    fetchInvitesCount();
    const interval = setInterval(fetchInvitesCount, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Hide Navbar inside /dashboard and /admin since DashboardShell provides the full-height workspace
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    return null;
  }

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    await logout();
  };

  const isHome = pathname === "/";

  const handleOpenInfo = (tab) => {
    setInfoModalTab(tab);
    setInfoModalOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 border-b ${
        scrolled
          ? "border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm backdrop-blur-md"
          : "border-transparent bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/20 transition-transform group-hover:scale-105">
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
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {appName}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 -mt-1 hidden sm:block">
              Hostel Allocation System
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              <Link
                href={user.role === "admin" ? "/admin" : "/dashboard"}
                className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {user.role === "admin" ? "Admin Console" : "Dashboard"}
              </Link>
              {user.role === "admin" ? (
                <>
                  <Link href="/admin/hostels" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Hostels
                  </Link>
                  <Link href="/admin/rooms" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Rooms
                  </Link>
                  <Link href="/admin/allocations" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Allocations
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard/room" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors">
                    My Room
                  </Link>
                  <Link href="/dashboard/rooms" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Choose Room
                  </Link>
                  <Link href="/dashboard/matches" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Matches
                  </Link>
                  <Link
                    href="/dashboard/invitations"
                    className="relative text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Invitations</span>
                    {pendingInvitesCount > 0 && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold leading-none text-white bg-amber-500 rounded-full animate-pulse">
                        {pendingInvitesCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleOpenInfo("how-it-works")}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => handleOpenInfo("features")}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => handleOpenInfo("faq")}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                FAQ
              </button>
            </>
          )}
        </nav>

        {/* Desktop Auth & Right Controls */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <NotificationBell userRole={user.role} />

              {/* User Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar name={user.name} size="sm" status="online" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                    {user.name}
                  </span>
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-xl z-50 animate-scale-in">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                          {user.role}
                        </p>
                      </div>
                      <Link
                        href={user.role === "admin" ? "/admin" : "/dashboard"}
                        className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        {user.role === "admin" ? "Admin Console" : "Dashboard"}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:from-indigo-500 hover:to-violet-500 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu & Theme Controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          {user && <NotificationBell userRole={user.role} />}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-6 space-y-4 animate-fade-up">
          <div className="space-y-2">
            {user ? (
              <>
                <Link
                  href={user.role === "admin" ? "/admin" : "/dashboard"}
                  className="block rounded-xl px-3 py-2 text-base font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {user.role === "admin" ? "Admin Console" : "Dashboard"}
                </Link>
                {user.role !== "admin" && (
                  <>
                    <Link href="/dashboard/room" className="block rounded-xl px-3 py-2 text-sm font-semibold text-indigo-600">
                      My Room
                    </Link>
                    <Link href="/dashboard/rooms" className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Choose Room
                    </Link>
                    <Link href="/dashboard/matches" className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Matches
                    </Link>
                    <Link href="/dashboard/invitations" className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Invitations {pendingInvitesCount > 0 && `(${pendingInvitesCount})`}
                    </Link>
                  </>
                )}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={user.name} size="sm" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {user.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenInfo("how-it-works")}
                    className="w-full text-left block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    How It Works
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenInfo("features")}
                    className="w-full text-left block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Features
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenInfo("faq")}
                    className="w-full text-left block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    FAQ
                  </button>
                </div>
                <Link
                  href="/login"
                  className="block w-full text-center rounded-xl border border-slate-300 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="block w-full text-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-sm"
                >
                  Register Student Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Interactive Info Modal */}
      <InfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        initialTab={infoModalTab}
      />
    </header>
  );
}
