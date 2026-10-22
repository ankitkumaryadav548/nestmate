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
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-4 border-t border-slate-100 ${className}`}
    >
      {totalItems !== undefined && (
        <p className="text-xs text-slate-500">
          Showing page <span className="font-semibold text-slate-800">{currentPage}</span> of{" "}
          <span className="font-semibold text-slate-800">{totalPages}</span>{" "}
          ({totalItems} total)
        </p>
      )}

      <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <span className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg">
          {currentPage}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
