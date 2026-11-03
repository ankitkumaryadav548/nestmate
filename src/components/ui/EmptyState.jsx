"use client";

/**
 * EmptyState Component
 * Displays a clean, friendly empty state with floating inline SVG illustration.
 */
export default function EmptyState({
  icon,
  title = "No data found",
  description = "No items match your criteria.",
  action,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200/90 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xs ${className}`}
    >
      <div className="relative mb-4 animate-float-slow">
        {icon ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-2xl text-indigo-600 dark:text-indigo-400 shadow-sm">
            {icon}
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
            <svg
              className="h-8 w-8 text-indigo-500/80 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.75 7.5m16.5 0a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25m16.5 0v3.75m-16.5-3.75v3.75m0 0h16.5"
              />
            </svg>
          </div>
        )}
      </div>

      <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
        {description}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
