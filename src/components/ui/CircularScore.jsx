"use client";

import { useEffect, useState } from "react";

/**
 * CircularScore Component
 * Circular SVG gauge for roommate compatibility score or occupancy percentage.
 * Color shifts smoothly based on threshold:
 * >= 75%: Teal / Emerald
 * >= 50%: Indigo / Violet
 * >= 35%: Amber
 * < 35%: Rose
 */
export default function CircularScore({
  score = 0,
  size = 64,
  strokeWidth = 5,
  showLabel = true,
  label = "Fit",
  className = "",
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clampedScore = Math.min(Math.max(Math.round(score), 0), 100);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const getColorClasses = (val) => {
    if (val >= 75) {
      return {
        stroke: "text-teal-500",
        text: "text-teal-700 dark:text-teal-300",
        bgStroke: "text-teal-100 dark:text-teal-950/40",
      };
    }
    if (val >= 50) {
      return {
        stroke: "text-indigo-500",
        text: "text-indigo-700 dark:text-indigo-300",
        bgStroke: "text-indigo-100 dark:text-indigo-950/40",
      };
    }
    if (val >= 35) {
      return {
        stroke: "text-amber-500",
        text: "text-amber-700 dark:text-amber-300",
        bgStroke: "text-amber-100 dark:text-amber-950/40",
      };
    }
    return {
      stroke: "text-rose-500",
      text: "text-rose-700 dark:text-rose-300",
      bgStroke: "text-rose-100 dark:text-rose-950/40",
    };
  };

  const colors = getColorClasses(clampedScore);

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${clampedScore}%`}
    >
      <svg className="h-full w-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          className={colors.bgStroke}
        />
        {/* Animated Fill circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={mounted ? strokeDashoffset : circumference}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          className={`${colors.stroke} transition-all duration-700 ease-out`}
        />
      </svg>

      {/* Centered Score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-extrabold tabular-nums tracking-tight leading-none ${colors.text}`}
          style={{ fontSize: size * 0.28 }}
        >
          {clampedScore}
          <span style={{ fontSize: size * 0.16 }}>%</span>
        </span>
        {showLabel && size >= 56 && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5 leading-none"
            style={{ fontSize: size * 0.14 }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

