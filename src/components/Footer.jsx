"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { openInfoModal } from "@/components/InfoModal";

/**
 * Footer Component
 * Slim, elegant footer with gradient top line, project name, tagline, and links.
 * Hidden on authenticated dashboard and admin pages.
 */
export default function Footer() {
  const pathname = usePathname();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "HostelMatch";

  // Hide footer inside dashboard and admin shells
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="relative w-full border-t border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 py-8 text-slate-600 dark:text-slate-400 backdrop-blur-md transition-colors">
      {/* Gradient top line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-extrabold text-xs shadow-sm shadow-indigo-500/20">
              HM
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {appName}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated Roommate Matching & Instant Room Selection
              </p>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => openInfoModal("how-it-works")}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => openInfoModal("features")}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => openInfoModal("faq")}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Register Student
            </Link>
            <Link href="/api/health" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              API Status
            </Link>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            © {new Date().getFullYear()} {appName}. Campus Housing Services.
          </p>
        </div>
      </div>
    </footer>
  );
}
