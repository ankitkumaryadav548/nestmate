"use client";

import React from "react";

/**
 * StackedBar
 * Pure CSS multi-segment progress bar with an interactive or readable legend.
 * Perfect for bed distribution (occupied, reserved, available) and preference satisfaction.
 */
export default function StackedBar({
  segments = [], // Array of { label, value, color, textClass, displayValue }
  total: customTotal,
  height = "h-4",
  showLegend = true,
  className = "",
}) {
  const calculatedTotal = customTotal || segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 1;

  const ariaSummary = segments
    .map((s) => `${s.label}: ${s.displayValue || s.value} (${Math.round(((s.value || 0) / calculatedTotal) * 100)}%)`)
    .join(", ");

  return (
    <div
      role="img"
      aria-label={`Stacked distribution bar: ${ariaSummary}`}
      className={`space-y-3 ${className}`}
    >
      {/* The Stacked Bar */}
      <div className={`w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex ${height} p-0.5 gap-0.5`}>
        {segments.map((seg, idx) => {
          const percentage = ((Number(seg.value) || 0) / calculatedTotal) * 100;
          if (percentage <= 0) return null;

          return (
            <div
              key={idx}
              className={`h-full first:rounded-l-full last:rounded-r-full transition-all duration-700 ease-out motion-reduce:transition-none ${seg.color || "bg-indigo-600"}`}
              style={{ width: `${percentage}%` }}
              title={`${seg.label}: ${seg.displayValue || seg.value} (${Math.round(percentage)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {segments.map((seg, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.color || "bg-indigo-600"}`} />
              <span className="text-slate-600 dark:text-slate-400">{seg.label}:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                {seg.displayValue !== undefined ? seg.displayValue : seg.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

