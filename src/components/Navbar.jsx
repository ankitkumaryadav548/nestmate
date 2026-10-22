"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "HostelMatch";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all">
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
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
          >
            Home
          </Link>
          <span
            title="Module coming in next phase"
            className="text-sm font-medium text-slate-400 cursor-not-allowed hover:text-slate-500 transition-colors"
          >
            Hostels
          </span>
          <span
            title="Module coming in next phase"
            className="text-sm font-medium text-slate-400 cursor-not-allowed hover:text-slate-500 transition-colors"
          >
            Matching
          </span>
        </nav>

        {/* Desktop Auth Placeholders */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="#login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-all"
          >
            Login
          </Link>
          <Link
            href="#register"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
          >
            Register
          </Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 px-4 pt-2 pb-6 space-y-3 backdrop-blur-md animate-in slide-in-from-top duration-200">
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-base font-medium text-slate-900 hover:bg-indigo-50 hover:text-indigo-600"
            >
              Home
            </Link>
            <span className="block rounded-lg px-3 py-2 text-base font-medium text-slate-400">
              Hostels (Next phase)
            </span>
            <span className="block rounded-lg px-3 py-2 text-base font-medium text-slate-400">
              Matching (Next phase)
            </span>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col gap-2">
            <Link
              href="#login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Login
            </Link>
            <Link
              href="#register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
