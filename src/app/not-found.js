import Link from "next/link";
import Button from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg text-center space-y-6">
        {/* Floating Illustration */}
        <div className="relative inline-flex items-center justify-center animate-float-slow">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 shadow-xl shadow-indigo-500/10">
            <svg
              className="h-12 w-12 text-indigo-600 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Badge */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-3.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
            404 • Page Not Found
          </span>
        </div>

        {/* Heading & Content */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            We couldn't find that room
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            The page you are looking for might have been moved, renamed, or is currently unavailable.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-center">
          <Link href="/">
            <Button variant="primary" size="lg" rightIcon={<IconArrowRight className="h-4 w-4" />}>
              Return to Safe Waters
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
