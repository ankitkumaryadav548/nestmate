export default function EmptyState({
  icon = "📂",
  title = "No data found",
  description = "No items match your criteria.",
  action,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 text-2xl mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
