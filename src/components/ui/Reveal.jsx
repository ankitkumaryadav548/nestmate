"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveal Component
 * Animates child content into view once via IntersectionObserver.
 * Completely disables animation if `prefers-reduced-motion` is active.
 *
 * @param {"fade-up" | "fade-in" | "scale-in" | "slide-right"} effect
 * @param {number} delay (ms)
 */
export default function Reveal({
  children,
  effect = "fade-up",
  delay = 0,
  threshold = 0.1,
  className = "",
}) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (elementRef.current) {
            observer.unobserve(elementRef.current);
          }
        }
      },
      { threshold }
    );

    const currentElem = elementRef.current;
    if (currentElem) observer.observe(currentElem);

    return () => {
      if (currentElem) observer.unobserve(currentElem);
    };
  }, [threshold]);

  const effectClasses = {
    "fade-up": "animate-fade-up",
    "fade-in": "animate-fade-in",
    "scale-in": "animate-scale-in",
    "slide-right": "animate-slide-in-right",
  };

  return (
    <div
      ref={elementRef}
      style={{
        animationDelay: `${delay}ms`,
        opacity: isVisible ? undefined : 0,
      }}
      className={`${isVisible ? effectClasses[effect] || "animate-fade-up" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

