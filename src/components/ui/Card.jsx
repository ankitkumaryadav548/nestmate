"use client";

/**
 * Card Component Suite
 * Modular, accessible compound card with variants:
 * - default: subtle slate border with soft shadow
 * - elevated: deeper layered shadow
 * - interactive: hover lift translateY(-2px), glow shadow, cursor pointer
 * - gradient-border: subtle indigo-violet gradient perimeter
 */
export function Card({
  variant = "default",
  className = "",
  children,
  onClick,
  as: Component = "div",
  ...props
}) {
  const variantStyles = {
    default:
      "border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm shadow-slate-200/50 dark:shadow-none",
    elevated:
      "border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/60 dark:shadow-black/40",
    interactive:
      "border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-200 cursor-pointer",
    "gradient-border":
      "relative p-[1px] bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-teal-500/30 rounded-2xl shadow-md",
  };

  if (variant === "gradient-border") {
    return (
      <Component
        className={`${variantStyles["gradient-border"]} ${className}`}
        onClick={onClick}
        {...props}
      >
        <div className="h-full w-full rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
          {children}
        </div>
      </Component>
    );
  }

  return (
    <Component
      onClick={onClick}
      className={`rounded-2xl transition-all duration-200 overflow-hidden ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ className = "", children, ...props }) {
  return (
    <div className={`p-5 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800/80 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", as: Component = "h3", children, ...props }) {
  return (
    <Component
      className={`text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardDescription({ className = "", children, ...props }) {
  return (
    <p className={`mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardBody({ className = "", children, ...props }) {
  return (
    <div className={`p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }) {
  return (
    <div
      className={`px-5 py-4 sm:px-6 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;

