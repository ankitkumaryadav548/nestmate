import React from 'react';

/**
 * InfoRow
 * Standard row presenting an icon, a label, and a value with high contrast WCAG AA.
 */
export default function InfoRow({
  icon,
  label,
  value,
  action,
  className = '',
}) {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0 text-sm ${className}`}>
      <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400 min-w-0">
        {icon && <span className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 flex items-center justify-center">{icon}</span>}
        <span className="text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100 shrink-0">
        <span>{value || '—'}</span>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

