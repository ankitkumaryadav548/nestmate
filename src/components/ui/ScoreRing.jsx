'use client';

import React from 'react';
import CircularScore from './CircularScore';
import { getScoreTone } from './ScoreTone';

/**
 * ScoreRing
 * Wrapper around CircularScore that applies the system-wide getScoreTone
 * and standard color thresholds (>=85 teal, 70-84 indigo, 50-69 amber, <50 neutral).
 */
export default function ScoreRing({
  score = 0,
  size = 56,
  strokeWidth = 5,
  showLabel = true,
  label,
  className = '',
}) {
  const tone = getScoreTone(score);

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <CircularScore
        score={score}
        size={size}
        strokeWidth={strokeWidth}
        showTrack={true}
        label={showLabel ? label : undefined}
      />
    </div>
  );
}

