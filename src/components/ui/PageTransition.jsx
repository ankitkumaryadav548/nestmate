"use client";

/**
 * PageTransition Component
 * Wraps page contents with a subtle fade-up entrance animation.
 */
export default function PageTransition({ children, className = "" }) {
  return (
    <div className={`w-full animate-fade-up duration-300 ${className}`}>
      {children}
    </div>
  );
}

