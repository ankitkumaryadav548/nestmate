"use client";

/**
 * Stepper Component
 * Multi-step progress bar for questionnaires, wizards, and allocation workflows.
 *
 * @param {Array<{ id: number | string, label: string, description?: string }>} steps
 * @param {number} currentStepIndex (0-indexed)
 * @param {(index: number) => void} onStepClick
 */
export default function Stepper({
  steps = [],
  currentStepIndex = 0,
  onStepClick,
  className = "",
}) {
  return (
    <nav aria-label="Progress Stepper" className={`w-full ${className}`}>
      <ol className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isUpcoming = idx > currentStepIndex;
          const isClickable = Boolean(onStepClick) && (isCompleted || isCurrent);

          return (
            <li
              key={step.id || idx}
              className={`relative flex flex-1 items-center ${
                idx === steps.length - 1 ? "flex-none" : ""
              }`}
            >
              <div
                onClick={() => isClickable && onStepClick(idx)}
                className={`group flex items-center gap-3 select-none ${
                  isClickable ? "cursor-pointer" : ""
                }`}
              >
                {/* Step Circle */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all duration-200 ${
                    isCompleted
                      ? "bg-teal-500 text-white shadow-sm shadow-teal-500/20"
                      : isCurrent
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-4 ring-indigo-100 dark:ring-indigo-950/60"
                      : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Step Labels */}
                <div className="hidden sm:block text-left">
                  <p
                    className={`text-xs font-bold transition-colors ${
                      isCurrent
                        ? "text-indigo-600 dark:text-indigo-400"
                        : isCompleted
                        ? "text-slate-900 dark:text-slate-100"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className="mx-3 sm:mx-4 h-0.5 flex-1 bg-slate-200 dark:bg-slate-800 transition-colors"
                >
                  <div
                    style={{ width: isCompleted ? "100%" : "0%" }}
                    className="h-full bg-teal-500 transition-all duration-300"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

