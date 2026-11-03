"use client";

/**
 * ProgressBar Component
 * Smoothly animated progress indicator with color by threshold or variant.
 */
export default function ProgressBar({
  value = 0,
  max = 100,
  showLabel = false,
  size = "md",
  variant = "auto", // "auto" | "brand" | "teal" | "amber" | "rose"
  className = "",
}) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const getAutoColor = (pct) => {
    if (pct >= 80) return "bg-gradient-to-r from-teal-500 to-emerald-500";
    if (pct >= 50) return "bg-gradient-to-r from-indigo-500 to-violet-500";
    if (pct >= 25) return "bg-gradient-to-r from-amber-500 to-amber-600";
    return "bg-gradient-to-r from-rose-500 to-rose-600";
  };

  const variantColors = {
    auto: getAutoColor(percentage),
    brand: "bg-gradient-to-r from-indigo-500 to-violet-600",
    teal: "bg-gradient-to-r from-teal-500 to-emerald-500",
    amber: "bg-gradient-to-r from-amber-500 to-amber-600",
    rose: "bg-gradient-to-r from-rose-500 to-rose-600",
  };

  const sizeHeights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span>Progress</span>
          <span className="tabular-nums">{percentage}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={`w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${
          sizeHeights[size] || sizeHeights.md
        }`}
      >
        <div
          style={{ width: `${percentage}%` }}
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            variantColors[variant] || variantColors.auto
          }`}
        />
      </div>
    </div>
  );
}

