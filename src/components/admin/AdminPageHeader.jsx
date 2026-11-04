"use client";

import React from "react";
import Link from "next/link";
import { IconChevronRight } from "@/components/ui/Icons";

/**
 * AdminPageHeader
 * Consistent header across all /admin pages.
 * Displays title, optional description, breadcrumbs, and an action slot on the right.
 */
export default function AdminPageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  className = "",
}) {
  return (
    <div className={`mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Link
              href="/admin"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Admin
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className="text-slate-400 dark:text-slate-600">/</span>
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 sm:self-center shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

