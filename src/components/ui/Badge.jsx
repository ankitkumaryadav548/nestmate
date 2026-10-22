export default function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
}) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    boys: "bg-blue-50 text-blue-700 border-blue-200",
    girls: "bg-pink-50 text-pink-700 border-pink-200",
    mixed: "bg-purple-50 text-purple-700 border-purple-200",
    ac: "bg-cyan-50 text-cyan-700 border-cyan-200",
    nonAc: "bg-amber-50 text-amber-800 border-amber-200",
    available: "bg-emerald-50 text-emerald-700 border-emerald-200",
    full: "bg-slate-100 text-slate-600 border-slate-300",
    maintenance: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${
        variants[variant] || variants.default
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {children}
    </span>
  );
}
