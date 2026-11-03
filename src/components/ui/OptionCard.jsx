'use client';

import React from 'react';
import { IconCheck } from './Icons';

/**
 * OptionCard
 * Selectable card for questionnaires, room sizes, floor preferences, and options.
 * Supports:
 * - Hover elevation and subtle border glow
 * - Active / pressed scale
 * - Selected state with brand ring, tinted background, and pop-in check icon
 * - Accessible keyboard navigation (role="radio" or role="checkbox", Enter/Space keydown)
 */
export default function OptionCard({
  selected = false,
  onClick,
  disabled = false,
  title,
  description,
  icon,
  badge,
  children,
  className = '',
  role = 'button',
  ariaChecked,
}) {
  const handleKeyDown = (e) => {
    if (disabled || !onClick) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={role}
      tabIndex={disabled ? -1 : 0}
      aria-checked={ariaChecked !== undefined ? ariaChecked : selected}
      aria-disabled={disabled}
      onClick={!disabled ? onClick : undefined}
      onKeyDown={handleKeyDown}
      className={`relative group rounded-xl p-4 sm:p-5 text-left transition-all duration-200 select-none cursor-pointer focus-ring outline-none border ${
        disabled
          ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          : selected
          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500 shadow-sm shadow-indigo-500/10 ring-2 ring-indigo-600 dark:ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/70 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]'
      } ${className}`}
    >
      {/* Checkmark indicator badge */}
      <div
        className={`absolute top-3.5 right-3.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
          selected
            ? 'bg-indigo-600 text-white scale-100 shadow-sm shadow-indigo-600/30'
            : 'border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-transparent scale-90 group-hover:border-slate-400 dark:group-hover:border-slate-600'
        }`}
        aria-hidden="true"
      >
        <IconCheck className={`w-3.5 h-3.5 transition-transform duration-150 ${selected ? 'scale-100' : 'scale-0'}`} />
      </div>

      <div className="flex items-start gap-3.5 pr-8">
        {icon && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              selected
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50'
            }`}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {title && (
              <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 font-heading">
                {title}
              </h4>
            )}
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          )}
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

