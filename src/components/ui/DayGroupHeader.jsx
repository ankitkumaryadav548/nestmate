import React from 'react';

/**
 * DayGroupHeader
 * Clean grouped day divider (e.g. "Today", "Yesterday", "Earlier") with subtle horizontal rule.
 */
export default function DayGroupHeader({ title, count, className = '' }) {
  return (
    <div className={`flex items-center gap-3 my-4 first:mt-0 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-heading">
        {title}
      </span>
      {count !== undefined && (
        <span className="px-1.5 py-0.2 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

