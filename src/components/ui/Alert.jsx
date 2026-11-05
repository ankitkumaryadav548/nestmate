"use client";

/**
 * Alert Component
 * Status notification block with left accent bar, semantic icons, and optional dismiss button.
 */
export default function Alert({
  type,
  variant,
  title,
  message,
  children,
  className = "",
  onClose,
}) {
  const configs = {
    error: {
      bar: "bg-rose-500",
      container:
        "border-rose-200/80 bg-rose-50/70 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200",
      icon: (
        <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    success: {
      bar: "bg-teal-500",
      container:
        "border-teal-200/80 bg-teal-50/70 text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-200",
      icon: (
        <svg className="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    warning: {
      bar: "bg-amber-500",
      container:
        "border-amber-200/80 bg-amber-50/70 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200",
      icon: (
        <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
    info: {
      bar: "bg-indigo-500",
      container:
        "border-indigo-200/80 bg-indigo-50/70 text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200",
      icon: (
        <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
    },
  };

  const resolvedType = (type || variant || "info").replace("danger", "error");
  const cfg = configs[resolvedType] || configs.info;

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3.5 overflow-hidden rounded-2xl border p-4 text-xs sm:text-sm animate-fade-in ${cfg.container} ${className}`}
    >
      {/* Left accent bar */}
      <div className={`absolute top-0 bottom-0 left-0 w-1 ${cfg.bar}`} />

      <div className="shrink-0 mt-0.5">{cfg.icon}</div>
      <div className="flex-1 min-w-0 pr-2">
        {title && <h4 className="font-bold tracking-tight mb-0.5">{title}</h4>}
        {message && <p className="leading-relaxed">{message}</p>}
        {children}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 -mr-1 -mt-1 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none"
          aria-label="Dismiss alert"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
