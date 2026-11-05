"use client";

/**
 * Select Component
 * Refined dropdown select with focus rings, custom chevron, and error display.
 */
export default function Select({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  const selectId = id || name;

  const handleChange = (e) => {
    if (!onChange) return;
    try {
      const fnStr = onChange.toString();
      if (fnStr.includes(".target") || fnStr.includes(".currentTarget")) {
        onChange(e);
      } else {
        onChange(e.target.value);
      }
    } catch {
      onChange(e);
    }
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <div className={`relative rounded-xl ${error ? "animate-error-shake" : ""}`}>
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
          className={`block w-full appearance-none rounded-xl border px-3.5 py-2.5 pr-10 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-60 cursor-pointer ${
            error
              ? "border-rose-400 bg-rose-50/50 text-rose-900 focus:border-rose-500 focus:ring-rose-400/40 dark:border-rose-500/60 dark:bg-rose-950/20 dark:text-rose-200"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/30"
          }`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {Array.isArray(options) && options.length > 0
            ? options.map((opt, idx) => (
                <option key={opt.value ?? idx} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        {/* Custom Chevron Indicator */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 dark:text-slate-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {error ? (
        <p id={`${selectId}-error`} className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-fade-in">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p id={`${selectId}-helper`} className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
