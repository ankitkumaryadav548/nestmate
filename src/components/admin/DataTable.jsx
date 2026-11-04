"use client";

import React from "react";
import Card from "@/components/ui/Card";
import { Table, TableSkeleton } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";

/**
 * DataTable
 * High-polish admin table wrapper.
 * Features:
 * - Rounded elevated card container
 * - Horizontal overflow scrolling
 * - Sticky header support
 * - Built-in TableSkeleton loading state
 * - Customizable EmptyState
 * - Integrated Pagination bar
 */
export default function DataTable({
  children,
  isLoading = false,
  isEmpty = false,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search criteria or filters.",
  emptyAction,
  pagination, // { currentPage, totalPages, onPageChange, totalItems }
  skeletonRows = 5,
  skeletonCols = 5,
  className = "",
}) {
  return (
    <Card className={`overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xs ${className}`}>
      <div className="w-full overflow-x-auto scrollbar-thin">
        {isLoading ? (
          <TableSkeleton rows={skeletonRows} cols={skeletonCols} />
        ) : isEmpty ? (
          <div className="py-12 px-4">
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              action={emptyAction}
            />
          </div>
        ) : (
          <Table hover zebra className="w-full text-left">
            {children}
          </Table>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && !isEmpty && pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
          <div>
            {pagination.totalItems !== undefined && (
              <span>
                Total <strong className="font-semibold text-slate-700 dark:text-slate-200">{pagination.totalItems}</strong> records
              </span>
            )}
          </div>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </Card>
  );
}

