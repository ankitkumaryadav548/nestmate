"use client";

/**
 * Textarea Component
 * Multi-line text input with character counter, animated focus ring,
 * error shake, and clear helper/error text.
 */
export default function Textarea({
  label,
  id,
  name,
  value = "",
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  rows = 3,
  maxLength,
  className = "",
  ...props
}) {
  const textareaId = id || name;
  const currentLength = typeof value === "string" ? value.length : 0;

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {label} {required && <span className="text-rose-500 font-bold">*</span>}
          </label>
        )}
        {maxLength && (
          <span
            className={`text-[11px] font-medium tabular-nums ${
              currentLength >= maxLength
                ? "text-rose-500 font-semibold"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {currentLength} / {maxLength}
          </span>
        )}
      </div>

      <div className={`relative rounded-xl ${error ? "animate-error-shake" : ""}`}>
        <textarea
          id={textareaId}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-60 resize-y ${
            error
              ? "border-rose-400 bg-rose-50/50 text-rose-900 placeholder:text-rose-300 focus:border-rose-500 focus:ring-rose-400/40 dark:border-rose-500/60 dark:bg-rose-950/20 dark:text-rose-200"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/30"
          }`}
          {...props}
        />
      </div>

      {error ? (
        <p id={`${textareaId}-error`} className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-fade-in">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p id={`${textareaId}-helper`} className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

