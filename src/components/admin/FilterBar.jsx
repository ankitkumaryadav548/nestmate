"use client";

import React from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

/**
 * FilterBar
 * Standard responsive filter bar for admin data tables and directories.
 * Encapsulated in a tidy Card with search, custom filter controls, and a "Clear filters" link.
 */
export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  children,
  onClear,
  hasActiveFilters = false,
  className = "",
}) {
  return (
    <Card className={`p-4 mb-6 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div className="flex flex-1 flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          {onSearchChange !== undefined && (
            <div className="min-w-[220px] max-w-sm flex-1">
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={search || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                leftIcon={
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>
          )}

          {children}
        </div>

        {hasActiveFilters && onClear && (
          <div className="flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

