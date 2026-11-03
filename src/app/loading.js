import Spinner from "@/components/ui/Spinner";

/**
 * Root Loading State
 * Clean, centralized loading screen for root route transitions.
 */
export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 rounded-full bg-indigo-500/15 dark:bg-indigo-500/25 animate-ping" />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md">
          <Spinner size="lg" />
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
        Loading campus housing...
      </p>
    </div>
  );
}

