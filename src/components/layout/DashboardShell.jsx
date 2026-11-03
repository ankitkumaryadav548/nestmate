"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import PageTransition from "@/components/ui/PageTransition";
import {
  IconDashboard,
  IconUser,
  IconUsers,
  IconBuilding,
  IconBed,
  IconShield,
  IconSparkles,
  IconSliders,
  IconMail,
  IconBell,
  IconKey,
  IconChart,
  IconAnnouncement,
  IconMenu,
  IconClose,
  IconChevronRight,
  IconLogOut,
} from "@/components/ui/Icons";

export default function DashboardShell({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  const isAdmin = user?.role === "admin";
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "HostelMatch";

  // Load sidebar collapsed state from localStorage safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hostelmatch_sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem("hostelmatch_sidebar_collapsed", String(next));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Fetch pending invitations + join requests for student badge
  useEffect(() => {
    if (!user || user.role !== "student") return;

    let isMounted = true;
    const fetchCounts = async () => {
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

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Grouped Navigation Items
  const studentNavGroups = [
    {
      label: "Main",
      items: [
        { href: "/dashboard", label: "Overview", icon: <IconDashboard /> },
        { href: "/dashboard/room", label: "My Room", icon: <IconBed /> },
        { href: "/dashboard/rooms", label: "Choose Room", icon: <IconKey /> },
        { href: "/dashboard/hostels", label: "Hostels", icon: <IconBuilding /> },
      ],
    },
    {
      label: "Matching & Groups",
      items: [
        { href: "/dashboard/matches", label: "Matches", icon: <IconSparkles /> },
        { href: "/dashboard/group", label: "My Group", icon: <IconUsers /> },
        {
          href: "/dashboard/invitations",
          label: "Invitations",
          icon: <IconMail />,
          badge: pendingInvitesCount > 0 ? (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
              {pendingInvitesCount}
            </span>
          ) : null,
        },
        { href: "/dashboard/preferences", label: "Preferences", icon: <IconSliders /> },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/dashboard/profile", label: "My Profile", icon: <IconUser /> },
        { href: "/dashboard/notifications", label: "Notifications", icon: <IconBell /> },
      ],
    },
  ];

  const adminNavGroups = [
    {
      label: "Management",
      items: [
        { href: "/admin", label: "Overview", icon: <IconDashboard /> },
        { href: "/admin/hostels", label: "Hostels", icon: <IconBuilding /> },
        { href: "/admin/rooms", label: "Rooms", icon: <IconBed /> },
        { href: "/admin/students", label: "Students", icon: <IconUser /> },
      ],
    },
    {
      label: "Matching & Allocation",
      items: [
        { href: "/admin/matching", label: "Matching", icon: <IconSparkles /> },
        { href: "/admin/groups", label: "Groups", icon: <IconUsers /> },
        { href: "/admin/demand", label: "Demand Analysis", icon: <IconChart /> },
        { href: "/admin/selection", label: "Selection Window", icon: <IconKey /> },
        { href: "/admin/allocations", label: "Allocations", icon: <IconBed /> },
      ],
    },
    {
      label: "System & Governance",
      items: [
        { href: "/admin/announcements", label: "Announcements", icon: <IconAnnouncement /> },
        { href: "/admin/notifications", label: "Notifications", icon: <IconBell /> },
        { href: "/admin/integrity", label: "Integrity Diagnostic", icon: <IconShield /> },
      ],
    },
  ];

  const navGroups = isAdmin ? adminNavGroups : studentNavGroups;

  // Derive Current Page Title & Breadcrumbs
  const getPageTitleAndBreadcrumbs = () => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.href === pathname) {
          return {
            title: item.label,
            breadcrumbs: [isAdmin ? "Admin Console" : "Dashboard", item.label],
          };
        }
      }
    }
    // Sub-routes fallback
    if (pathname.includes("/admin/hostels/new")) {
      return { title: "New Hostel", breadcrumbs: ["Admin Console", "Hostels", "New"] };
    }
    if (pathname.includes("/admin/hostels/")) {
      return { title: "Hostel Details", breadcrumbs: ["Admin Console", "Hostels", "Details"] };
    }
    if (pathname.includes("/admin/groups/")) {
      return { title: "Group Audit", breadcrumbs: ["Admin Console", "Groups", "Audit"] };
    }
    if (pathname.includes("/admin/allocations/")) {
      return { title: "Allocation Run", breadcrumbs: ["Admin Console", "Allocations", "Run"] };
    }
    return {
      title: isAdmin ? "Admin Console" : "Dashboard",
      breadcrumbs: [isAdmin ? "Admin Console" : "Dashboard"],
    };
  };

  const { title: currentTitle, breadcrumbs } = getPageTitleAndBreadcrumbs();

  const isLinkActive = (href) => {
    if (href === "/dashboard" || href === "/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors">
      {/* =====================================================================
          DESKTOP LEFT SIDEBAR
          ===================================================================== */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-all duration-300 z-30 sticky top-0 h-screen ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <Link href="/" className="flex items-center gap-3 overflow-hidden group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 animate-fade-in">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                  {appName}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 -mt-0.5">
                  {isAdmin ? "Admin Console" : "Campus Housing"}
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-all duration-150 group ${
                      active
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                    } ${isCollapsed ? "justify-center px-0" : ""}`}
                  >
                    {/* Active Left Indicator Bar */}
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-indigo-600 dark:bg-indigo-400" />
                    )}

                    <span className={`shrink-0 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}>
                      {item.icon}
                    </span>

                    {!isCollapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="shrink-0">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 ${isCollapsed ? "justify-center p-1.5" : ""}`}>
            <Avatar name={user?.name} size="sm" status="online" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user?.name}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 truncate">
                  {user?.role}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* =====================================================================
          MOBILE DRAWER SIDEBAR
          ===================================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl border-r border-slate-200 dark:border-slate-800 z-10 animate-slide-in-right">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                {appName}
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Close navigation"
              >
                <IconClose />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const active = isLinkActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                          active
                            ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        <span className={active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}>
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={user?.name} size="sm" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {user?.name}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MAIN APP WORKSPACE
          ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Compact Top Navigation Bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open mobile navigation"
            >
              <IconMenu />
            </button>

            {/* Breadcrumbs & Title */}
            <div className="flex flex-col min-w-0">
              <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                {breadcrumbs.map((crumb, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    {idx > 0 && <IconChevronRight className="h-3 w-3 shrink-0" />}
                    <span className={idx === breadcrumbs.length - 1 ? "font-semibold text-slate-700 dark:text-slate-300" : ""}>
                      {crumb}
                    </span>
                  </span>
                ))}
              </nav>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate leading-tight">
                {currentTitle}
              </h2>
            </div>
          </div>

          {/* Right Topbar Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Notification Bell */}
            <NotificationBell userRole={user?.role} />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User account menu"
              >
                <Avatar name={user?.name} size="sm" status="online" />
                <div className="hidden lg:flex flex-col text-left leading-none pr-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                    {user?.name}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase mt-0.5">
                    {user?.role}
                  </span>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-xl z-50 animate-scale-in">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {user?.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {user?.email}
                      </p>
                    </div>

                    {!isAdmin && (
                      <>
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <IconUser className="h-4 w-4 text-slate-400" />
                          My Profile
                        </Link>
                        <Link
                          href="/dashboard/preferences"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <IconSliders className="h-4 w-4 text-slate-400" />
                          Questionnaire Preferences
                        </Link>
                      </>
                    )}

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await logout();
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <IconLogOut className="h-4 w-4 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Children wrapped with smooth fade-up */}
        <main className="flex-1 overflow-y-auto">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

