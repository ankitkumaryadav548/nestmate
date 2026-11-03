"use client";

/**
 * Table Component Suite
 * Modular table components with sticky headers, subtle zebra rows,
 * smooth hover states, rounded containers, and loading skeleton.
 */

export function Table({ className = "", children, ...props }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm text-slate-700 dark:text-slate-300 ${className}`} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHeader({ className = "", children, ...props }) {
  return (
    <thead className={`bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = "", children, ...props }) {
  return (
    <tbody className={`divide-y divide-slate-100 dark:divide-slate-800/70 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className = "", isClickable = false, children, ...props }) {
  return (
    <tr
      className={`transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
        isClickable ? "cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className = "", sticky = false, children, ...props }) {
  return (
    <th
      scope="col"
      className={`px-4 sm:px-6 py-3.5 font-bold ${
        sticky ? "sticky top-0 bg-slate-50 dark:bg-slate-800 z-10" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className = "", children, ...props }) {
  return (
    <td className={`px-4 sm:px-6 py-3.5 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: cols }).map((_, i) => (
            <TableHead key={i}>
              <div className="h-3 w-20 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rIdx) => (
          <TableRow key={rIdx}>
            {Array.from({ length: cols }).map((_, cIdx) => (
              <TableCell key={cIdx}>
                <div
                  style={{ width: `${60 + (cIdx * 15) % 40}%` }}
                  className="h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse"
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default Table;

