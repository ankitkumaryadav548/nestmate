"use client";

import AnimatedNumber from "./AnimatedNumber";

/**
 * StatCard Component
 * Displays a key statistic with an icon, count-up number, optional trend badge,
 * and a subtle accent bar.
 */
export default function StatCard({
  icon,
  label,
  value,
  prefix = "",
  suffix = "",
  trend,
  trendDirection = "up", // "up" | "down" | "neutral"
  accent = "indigo", // "indigo" | "teal" | "amber" | "rose" | "purple"
  subtext,
  className = "",
}) {
  const accentConfigs = {
    indigo: {
      bar: "bg-indigo-500",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400",
    },
    teal: {
      bar: "bg-teal-500",
      iconBg: "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400",
    },
    amber: {
      bar: "bg-amber-500",
      iconBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    },
    rose: {
      bar: "bg-rose-500",
      iconBg: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
    },
    purple: {
      bar: "bg-purple-500",
      iconBg: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
    },
  };

  const cfg = accentConfigs[accent] || accentConfigs.indigo;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${className}`}
    >
      {/* Top thin accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${cfg.bar}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              {typeof value === "number" ? (
                <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
              ) : (
                `${prefix}${value}${suffix}`
              )}
            </span>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-bold ${
                  trendDirection === "up"
                    ? "text-teal-600 dark:text-teal-400"
                    : trendDirection === "down"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-500"
                }`}
              >
                {trendDirection === "up" ? "↑" : trendDirection === "down" ? "↓" : "•"} {trend}
              </span>
            )}
          </div>
          {subtext && (
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              {subtext}
            </p>
          )}
        </div>

        {icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

