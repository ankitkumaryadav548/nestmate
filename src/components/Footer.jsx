"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(2026);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "HostelMatch";

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full border-t border-slate-200 bg-slate-50/80 py-10 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                HM
              </div>
              <span className="text-base font-bold text-slate-900">{appName}</span>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Smart hostel allocation and roommate matching system. Generic, configurable, and ready for deployment at any college, university, or institute of higher education.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
              Multi-Institution Architecture
            </div>
          </div>

          {/* System Modules */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">
              Planned Modules
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="text-slate-500">Hostel & Block Management</li>
              <li className="text-slate-500">Room Inventory & Capacity</li>
              <li className="text-slate-500">Roommate Matching Engine</li>
              <li className="text-slate-500">Automated Room Allocation</li>
            </ul>
          </div>

          {/* Developer / Project Info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">
              Project Stack
            </h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>Next.js App Router (Full-Stack)</li>
              <li>MongoDB Atlas & Mongoose</li>
              <li>Tailwind CSS & React</li>
              <li>REST Route Handlers</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {currentYear} {appName}. All rights reserved. Configurable for higher education institutions.
          </p>
          <div className="flex items-center gap-4">
            <span className="hover:text-indigo-600 transition-colors">Documentation</span>
            <span>•</span>
            <span className="hover:text-indigo-600 transition-colors">API Health</span>
            <span>•</span>
            <span className="hover:text-indigo-600 transition-colors">Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
