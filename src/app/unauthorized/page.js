"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 bg-slate-50">
      <div className="w-full max-w-md text-center">
        {/* Warning Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200 mb-6">
          <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
          403 Forbidden
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Access Restricted
        </h1>

        {/* Description */}
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          You do not have the required role permissions to view the requested resource. The administrator console is restricted to university staff and administrators.
        </p>

        {user && (
          <div className="mt-4 p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 text-left">
            <p><strong>Signed in as:</strong> {user.name} ({user.email})</p>
            <p className="mt-0.5"><strong>Current role:</strong> <span className="uppercase text-indigo-600 font-semibold">{user.role}</span></p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700 transition-all"
          >
            Go to Student Dashboard
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}
