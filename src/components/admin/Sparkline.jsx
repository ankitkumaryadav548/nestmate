"use client";

import React from "react";

/**
 * Sparkline
 * Inline SVG mini sparkline trend chart.
 * Renders a smooth path with optional gradient fill under the line.
 */
export default function Sparkline({
  data = [], // Array of numeric values
  width = 120,
  height = 36,
  strokeColor = "#4f46e5",
  fillColor = "rgba(79, 70, 229, 0.1)",
  className = "",
  ariaLabel,
}) {
  if (!data || data.length < 2) {
    return <div className={`inline-block ${className}`} style={{ width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  // Calculate coordinates
  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - min) / range) * (height - 2 * padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel || `Sparkline trend: range ${min} to ${max}`}
      className={`overflow-visible inline-block ${className}`}
    >
      {/* Area fill */}
      <path d={areaD} fill={fillColor} />
      {/* Stroke line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

