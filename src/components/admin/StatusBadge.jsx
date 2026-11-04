"use client";

import React from "react";
import Badge from "@/components/ui/Badge";
import {
  getRoomStatusClasses,
  getRunStatusClasses,
  getWindowStatusClasses,
} from "@/components/ui/StatusTones";
import { getScoreClasses } from "@/components/ui/ScoreTone";

/**
 * StatusBadge
 * Unified badge component for admin dashboards adhering to the semantic tone specifications.
 * Supports:
 * - type="room": Available, Claimed, Full, Maintenance
 * - type="run": Draft, Publishing, Published, Rolled Back, Failed
 * - type="window": Open (pulsing live dot), Scheduled, Closed, Finalized
 * - type="score": 85+ (teal), 70-84 (indigo), 50-69 (amber), <50 (neutral)
 */
export default function StatusBadge({
  type = "generic",
  status,
  score,
  label,
  size = "sm",
  className = "",
}) {
  if (type === "room") {
    const meta = getRoomStatusClasses(status);
    return (
      <Badge
        variant={meta.badge}
        size={size}
        dot
        className={className}
      >
        {label || meta.label}
      </Badge>
    );
  }

  if (type === "run") {
    const meta = getRunStatusClasses(status);
    return (
      <Badge
        variant={meta.badge}
        size={size}
        dot
        className={className}
      >
        {label || meta.label}
      </Badge>
    );
  }

  if (type === "window") {
    const meta = getWindowStatusClasses(status);
    return (
      <Badge
        variant={meta.badge}
        size={size}
        dot
        pulse={meta.pulse}
        className={className}
      >
        {label || meta.label}
      </Badge>
    );
  }

  if (type === "score") {
    const meta = getScoreClasses(score);
    return (
      <Badge
        variant={meta.badge}
        size={size}
        className={className}
      >
        {label || `${Math.round(Number(score) || 0)}%`}
      </Badge>
    );
  }

  // Generic fallback
  return (
    <Badge size={size} className={className}>
      {label || String(status || "")}
    </Badge>
  );
}

