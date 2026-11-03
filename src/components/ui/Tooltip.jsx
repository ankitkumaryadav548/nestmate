"use client";

/**
 * Tooltip Component
 * Pure CSS / accessible hover tooltip with directional positioning.
 */
export default function Tooltip({
  content,
  children,
  position = "top", // "top" | "bottom" | "left" | "right"
  className = "",
}) {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className={`group relative inline-flex ${className}`}>
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-white shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
          positionClasses[position] || positionClasses.top
        }`}
      >
        {content}
      </div>
    </div>
  );
}

