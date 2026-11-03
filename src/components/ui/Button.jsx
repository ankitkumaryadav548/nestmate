"use client";

/**
 * Button Component
 * Highly polished interactive button with smooth hover lift, soft shine sweep,
 * focus rings, and accessible loading state.
 *
 * @param {"primary" | "secondary" | "outline" | "ghost" | "danger" | "success"} variant
 * @param {"sm" | "md" | "lg"} size
 * @param {boolean} isLoading
 * @param {boolean} disabled
 * @param {React.ReactNode} leftIcon
 * @param {React.ReactNode} rightIcon
 */
export default function Button({
  type = "button",
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  className = "",
  onClick,
  ...props
}) {
  const baseStyles =
    "group relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5 min-h-[32px]",
    md: "px-4 py-2 text-sm gap-2 min-h-[40px]",
    lg: "px-5 py-2.5 text-base gap-2.5 min-h-[48px]",
  };

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 hover:shadow-md hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-indigo-600 overflow-hidden",
    secondary:
      "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-slate-500 shadow-xs",
    outline:
      "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-400 dark:hover:border-slate-600 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-indigo-600 shadow-xs",
    ghost:
      "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white active:scale-[0.98] focus-visible:outline-indigo-500",
    danger:
      "bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-sm shadow-rose-500/20 hover:from-rose-500 hover:to-rose-600 hover:shadow-md hover:shadow-rose-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-rose-600",
    success:
      "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm shadow-teal-500/20 hover:from-teal-500 hover:to-emerald-500 hover:shadow-md hover:shadow-teal-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-teal-600",
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {/* Soft shine sweep effect on primary variant */}
      {variant === "primary" && !isDisabled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
      )}

      {/* Loading Spinner */}
      {isLoading ? (
        <svg
          className="h-4 w-4 animate-spin text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}

      <span className={isLoading ? "opacity-90" : ""}>{children}</span>

      {!isLoading && rightIcon && (
        <span className="inline-flex shrink-0">{rightIcon}</span>
      )}
    </button>
  );
}
