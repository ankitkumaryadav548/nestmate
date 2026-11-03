"use client";

import { useEffect, useState, useRef } from "react";

/**
 * AnimatedNumber Component
 * Smoothly counts from 0 up to `value` once on viewport entry.
 * Immediately displays target value if `prefers-reduced-motion` is active.
 */
export default function AnimatedNumber({
  value = 0,
  duration = 1000,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const elementRef = useRef(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // If reduced motion is requested, skip animation immediately
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    const targetNumber = Number(value) || 0;
    if (targetNumber === 0) {
      setDisplayValue(0);
      return;
    }

    // IntersectionObserver to only animate once when visible
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;

          const startTime = performance.now();

          const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const current = easedProgress * targetNumber;

            setDisplayValue(current);

            if (progress < 1) {
              requestAnimationFrame(update);
            } else {
              setDisplayValue(targetNumber);
            }
          };

          requestAnimationFrame(update);
        }
      },
      { threshold: 0.1 }
    );

    const currentElem = elementRef.current;
    if (currentElem) {
      observer.observe(currentElem);
    }

    return () => {
      if (currentElem) observer.unobserve(currentElem);
    };
  }, [value, duration]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue);

  return (
    <span ref={elementRef} className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

