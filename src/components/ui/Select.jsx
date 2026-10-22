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
  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id || name}
          className="block text-xs font-semibold text-slate-700"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative rounded-xl">
        <select
          id={id || name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 bg-white ${
            error
              ? "border-rose-300 bg-rose-50/30 text-rose-900 focus:border-rose-500 focus:ring-rose-400"
              : "border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-500"
          }`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
      </div>

      {error ? (
        <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
          <svg className="h-3.5 w-3.5 inline shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
