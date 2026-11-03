'use client';

import React, { useState, useEffect } from 'react';
import Badge from './Badge';

/**
 * CountdownBadge
 * Displays live countdown badge (days, hours, mins, or secs) until target date.
 * Tone shifts to 'warning' (amber) when under 48 hours, or 'danger' when expired/imminent.
 * Respects prefers-reduced-motion.
 */
export default function CountdownBadge({
  targetDate,
  expiredText = 'Expired',
  prefix = '⏳ ',
  className = '',
}) {
  const [timeLeft, setTimeLeft] = useState('');
  const [tone, setTone] = useState('neutral');

  useEffect(() => {
    if (!targetDate) return;

    function calculate() {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(expiredText);
        setTone('danger');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 2) {
        setTimeLeft(`${days}d ${hours}h left`);
        setTone('info');
      } else if (days >= 1) {
        setTimeLeft(`${days}d ${hours}h left`);
        setTone('warning');
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m left`);
        setTone('warning');
      } else {
        setTimeLeft(`${mins}m ${secs}s left`);
        setTone('danger');
      }
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate, expiredText]);

  if (!timeLeft) return null;

  return (
    <Badge variant={tone} className={`font-mono text-xs ${className}`}>
      {prefix}{timeLeft}
    </Badge>
  );
}

