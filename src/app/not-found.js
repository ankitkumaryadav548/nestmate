import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center">
        {/* Visual Pill */}
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200/60 mb-6">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
          404 Error
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="mt-4 text-base text-slate-600 leading-relaxed">
          The requested page could not be found. It might have been moved, renamed, or is still under construction in an upcoming development phase.
        </p>

        {/* Action Button */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-indigo-500/35 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
