"use client";

/**
 * Avatar Component
 * Displays user initials over a soft gradient background with size variants and status dot.
 */
export default function Avatar({
  name = "User",
  size = "md",
  status, // "online" | "busy" | "offline"
  className = "",
}) {
  const getInitials = (str) => {
    if (!str) return "U";
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const sizeMap = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
    xl: "h-14 w-14 text-lg",
  };

  const statusSizeMap = {
    sm: "h-2 w-2 ring-1",
    md: "h-2.5 w-2.5 ring-2",
    lg: "h-3 w-3 ring-2",
    xl: "h-3.5 w-3.5 ring-2",
  };

  const statusColorMap = {
    online: "bg-teal-500 ring-white dark:ring-slate-900",
    busy: "bg-amber-500 ring-white dark:ring-slate-900",
    offline: "bg-slate-400 ring-white dark:ring-slate-900",
  };

  return (
    <div className={`relative inline-flex shrink-0 select-none ${className}`}>
      <div
        className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-xs ${
          sizeMap[size] || sizeMap.md
        }`}
      >
        {getInitials(name)}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ${
            statusColorMap[status] || statusColorMap.online
          } ${statusSizeMap[size] || statusSizeMap.md}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

