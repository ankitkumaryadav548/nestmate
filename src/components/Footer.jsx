"use client";

import { useState, useEffect } from "react";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(2026);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "HostelMatch";

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full border-t border-slate-200 bg-white py-8 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
              HM
            </div>
            <span className="text-sm font-bold text-slate-900">{appName}</span>
            <span className="text-xs text-slate-400">| Smart Roommate Matching & Hostel Allocation</span>
          </div>

          <p className="text-xs text-slate-500">
            © {currentYear} {appName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
