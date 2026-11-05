"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = "info", message, title = "", duration = 4000 }) => {
      const id = ++toastIdCounter;
      const newToast = { id, type, message, title, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  const pauseToast = useCallback((id) => {
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
  }, []);

  const resumeToast = useCallback(
    (id, duration = 2500) => {
      if (!timersRef.current.has(id)) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [removeToast]
  );

  const showToast = useCallback(
    (message, type = "info", options = {}) => {
      const validTypes = ["success", "error", "info", "warning"];
      const resolvedType = validTypes.includes(type) ? type : "info";
      return addToast({ type: resolvedType, message, ...options });
    },
    [addToast]
  );

  const toast = {
    showToast,
    success: (message, title = "Success", options = {}) =>
      addToast({ type: "success", message, title, ...options }),
    error: (message, title = "Error", options = {}) =>
      addToast({ type: "error", message, title, ...options }),
    info: (message, title = "Notice", options = {}) =>
      addToast({ type: "info", message, title, ...options }),
    warning: (message, title = "Warning", options = {}) =>
      addToast({ type: "warning", message, title, ...options }),
    dismiss: removeToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 left-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none sm:bottom-auto sm:top-5 sm:left-auto sm:right-5 sm:w-96"
      >
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => removeToast(t.id)}
            onMouseEnter={() => pauseToast(t.id)}
            onMouseLeave={() => resumeToast(t.id, 2500)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastItem({ toast, onDismiss, onMouseEnter, onMouseLeave }) {
  const { type, message, title } = toast;

  const typeConfig = {
    success: {
      border: "border-teal-500/40 dark:border-teal-500/30",
      bg: "bg-white/95 dark:bg-slate-900/95",
      accent: "bg-teal-500",
      text: "text-teal-700 dark:text-teal-300",
      icon: (
        <svg className="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    error: {
      border: "border-rose-500/40 dark:border-rose-500/30",
      bg: "bg-white/95 dark:bg-slate-900/95",
      accent: "bg-rose-500",
      text: "text-rose-700 dark:text-rose-300",
      icon: (
        <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    warning: {
      border: "border-amber-500/40 dark:border-amber-500/30",
      bg: "bg-white/95 dark:bg-slate-900/95",
      accent: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      icon: (
        <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
    info: {
      border: "border-indigo-500/40 dark:border-indigo-500/30",
      bg: "bg-white/95 dark:bg-slate-900/95",
      accent: "bg-indigo-500",
      text: "text-indigo-700 dark:text-indigo-300",
      icon: (
        <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
    },
  };

  const cfg = typeConfig[type] || typeConfig.info;

  return (
    <div
      role="alert"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 ease-out animate-slide-in-down sm:animate-slide-in-right ${cfg.bg} ${cfg.border}`}
    >
      {/* Left accent bar */}
      <div className={`absolute top-0 bottom-0 left-0 w-1 ${cfg.accent}`} />

      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">{cfg.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2">
        {title && <p className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</p>}
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">{message}</p>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 -mr-1 -mt-1 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

