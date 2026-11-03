"use client";

import Button from "./Button";

/**
 * ErrorState Component
 * Displays an error illustration, informative message, and optional retry action button.
 */
export default function ErrorState({
  title = "Something went wrong",
  message = "We encountered an unexpected error while processing your request.",
  onRetry,
  retryText = "Try Again",
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 backdrop-blur-xs ${className}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 mb-4 shadow-sm">
        <svg
          className="h-8 w-8"
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

      <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <div className="mt-6">
          <Button type="button" variant="primary" size="sm" onClick={onRetry}>
            {retryText}
          </Button>
        </div>
      )}
    </div>
  );
}

