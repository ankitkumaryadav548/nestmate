"use client";

import React from "react";

/**
 * DonutRing
 * Lightweight inline SVG Donut / Gauge chart with center label and optional subtitle.
 * Supports custom size, strokeWidth, and color.
 */
export default function DonutRing({
  value = 0,
  max = 100,
  size = 110,
  strokeWidth = 9,
  centerValue,
  centerLabel,
  color = "#4f46e5",
  trackColor = "stroke-slate-100 dark:stroke-slate-800",
  className = "",
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      role="img"
      aria-label={`${centerLabel || "Value"}: ${centerValue !== undefined ? centerValue : `${Math.round(percentage)}%`}`}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          className={trackColor}
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
        <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-heading leading-tight">
          {centerValue !== undefined ? centerValue : `${Math.round(percentage)}%`}
        </span>
        {centerLabel && (
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 max-w-[80px] truncate">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
}

