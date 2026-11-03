"use client";

/**
 * Spinner Component
 * Sleek SVG loading spinner with size variants and accessible label.
 */
export default function Spinner({
  size = "md",
  className = "",
  label = "Loading...",
}) {
  const sizeMap = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-9 w-9",
    xl: "h-12 w-12",
  };

  return (
    <div role="status" className="inline-flex items-center justify-center">
      <svg
        className={`animate-spin text-indigo-600 dark:text-indigo-400 ${
          sizeMap[size] || sizeMap.md
        } ${className}`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3.5"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

