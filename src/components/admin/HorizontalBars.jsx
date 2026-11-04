"use client";

import React from "react";

/**
 * HorizontalBars
 * Pure CSS/SVG horizontal bar chart.
 * - Animates width once on mount
 * - Accessible aria-label listing numbers
 * - Labelled bars with values
 * - Optional custom color per bar
 */
export default function HorizontalBars({
  data = [], // Array of { label, value, max, displayValue, color }
  max: customMax,
  className = "",
  barHeight = "h-3",
}) {
  const calculatedMax = customMax || Math.max(...data.map((d) => d.value || 0), 1);

  const ariaSummary = data.map((d) => `${d.label}: ${d.displayValue || d.value}`).join(", ");

  return (
    <div
      role="img"
      aria-label={`Horizontal bar chart: ${ariaSummary}`}
      className={`space-y-3.5 ${className}`}
    >
      {data.map((item, idx) => {
        const itemMax = item.max || calculatedMax;
        const percentage = Math.min(100, Math.max(0, (item.value / itemMax) * 100));
        const barColor = item.color || "bg-indigo-600 dark:bg-indigo-500";

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={item.label}>
                {item.label}
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0 font-mono">
                {item.displayValue !== undefined ? item.displayValue : item.value}
              </span>
            </div>

            <div className={`w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ${barHeight}`}>
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out motion-reduce:transition-none ${barColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

