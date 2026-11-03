"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

/**
 * Global Error Boundary Component
 * Catches unhandled application errors and displays a clear message with a retry option.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[HostelMatch Runtime Error]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Floating Illustration */}
        <div className="relative inline-flex items-center justify-center animate-float-slow">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40 shadow-xl shadow-rose-500/10">
            <svg
              className="h-10 w-10 text-rose-600 dark:text-rose-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Badge */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/50 px-3.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800">
            System Notice
          </span>
        </div>

        {/* Heading & Content */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred while loading this page. Our diagnostic service has recorded the event.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-center gap-3">
          <Button variant="primary" size="md" onClick={() => reset()}>
            Try Again
          </Button>
          <Button variant="outline" size="md" onClick={() => (window.location.href = "/")}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

