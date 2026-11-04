"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/**
 * ConfirmTypeDialog
 * Modal requiring the user to type a specific confirmation keyword (e.g. "PUBLISH", "ROLLBACK", "FINALIZE")
 * before triggering sensitive or irreversible admin operations.
 */
export default function ConfirmTypeDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Critical Operation",
  description,
  requiredWord = "CONFIRM",
  items = [], // Array of summary bullet points
  confirmButtonText = "Confirm Action",
  variant = "danger", // "danger" | "warning"
  isLoading = false,
}) {
  const [typedValue, setTypedValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTypedValue("");
    }
  }, [isOpen]);

  const isMatch = typedValue.trim() === requiredWord;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isMatch && !isLoading) {
      onConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header with Icon */}
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              variant === "danger"
                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40"
            }`}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
              {title}
            </h3>
            {description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Summary Bullet Points */}
        {items && items.length > 0 && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3.5 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
            <span className="font-semibold block text-slate-900 dark:text-slate-200">
              Key outcomes of this operation:
            </span>
            <ul className="list-disc list-inside space-y-1 pl-1">
              {items.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confirmation Input Field */}
        <div className="space-y-1.5 pt-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            To proceed, type <span className="font-mono font-bold text-rose-600 dark:text-rose-400 select-all">{requiredWord}</span> below:
          </label>
          <Input
            type="text"
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder={`Type "${requiredWord}" to confirm`}
            autoFocus
            className="font-mono text-center tracking-wider text-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            disabled={!isMatch || isLoading}
            isLoading={isLoading}
          >
            {confirmButtonText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

