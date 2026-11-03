"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import { IconShield, IconArrowRight } from "@/components/ui/Icons";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg text-center space-y-6">
        {/* Floating Shield Illustration */}
        <div className="relative inline-flex items-center justify-center animate-float-slow">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40 shadow-xl shadow-rose-500/10">
            <IconShield className="h-12 w-12 text-rose-600 dark:text-rose-400" />
          </div>
        </div>

        {/* Warning Badge */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/50 px-3.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800">
            403 • Access Restricted
          </span>
        </div>

        {/* Heading & Content */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Restricted Area
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            You do not have the required permissions to view this resource. The administrator console is reserved for university housing staff.
          </p>
        </div>

        {user && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 text-left space-y-1 shadow-xs">
            <p>
              <strong>Signed in as:</strong> {user.name} ({user.email})
            </p>
            <p>
              <strong>Current role:</strong>{" "}
              <span className="uppercase font-bold text-indigo-600 dark:text-indigo-400">
                {user.role}
              </span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full" rightIcon={<IconArrowRight className="h-4 w-4" />}>
              Go to Student Dashboard
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => logout()}
          >
            Switch Account
          </Button>
        </div>
      </div>
    </div>
  );
}
