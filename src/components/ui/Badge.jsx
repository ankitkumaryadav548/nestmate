"use client";

/**
 * Badge Component
 * Soft-tinted semantic tag with optional dot and pulse effect.
 */
export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  pulse = false,
  className = "",
  ...props
}) {
  const variants = {
    // Semantic Tokens
    neutral:
      "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    brand:
      "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60",
    success:
      "bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
    warning:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    danger:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
    info:
      "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",

    // Backward-compatible aliases
    default:
      "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    indigo:
      "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60",
    blue:
      "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
    emerald:
      "bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
    purple:
      "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
    amber:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    rose:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",

    // Domain Tags
    boys: "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
    girls: "bg-pink-50 text-pink-700 border-pink-200/80 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60",
    mixed: "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
    ac: "bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60",
    nonAc: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    available: "bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
    full: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    maintenance: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
  };

  const dotColors = {
    neutral: "bg-slate-400",
    brand: "bg-indigo-500",
    success: "bg-teal-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-blue-500",
    default: "bg-slate-400",
    indigo: "bg-indigo-500",
    blue: "bg-blue-500",
    emerald: "bg-teal-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    boys: "bg-blue-500",
    girls: "bg-pink-500",
    mixed: "bg-purple-500",
    ac: "bg-cyan-500",
    nonAc: "bg-amber-500",
    available: "bg-teal-500",
    full: "bg-slate-400",
    maintenance: "bg-rose-500",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
    lg: "px-3 py-1 text-sm gap-2",
  };

  const dotSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border transition-colors select-none ${
        variants[variant] || variants.default
      } ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`shrink-0 rounded-full ${dotColors[variant] || dotColors.default} ${
            dotSizes[size] || dotSizes.md
          } ${pulse ? "animate-pulse" : ""}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
