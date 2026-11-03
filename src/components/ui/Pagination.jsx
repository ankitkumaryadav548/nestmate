"use client";

/**
 * Pagination Component
 * Accessible page navigation bar with page summary, previous/next controls, and active indicator.
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  onPageChange,
  className = "",
}) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-4 border-t border-slate-100 dark:border-slate-800 ${className}`}
    >
      {totalItems !== undefined && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing page{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {currentPage}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {totalPages}
          </span>{" "}
          ({totalItems} total)
        </p>
      )}

      <nav aria-label="Pagination Navigation" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-xs">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span>Previous</span>
        </button>

        <span className="px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg shadow-xs tabular-nums">
          {currentPage}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <span>Next</span>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </nav>
    </div>
  );
}
