"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tabs Component
 * Accessible tabs with animated sliding indicator and keyboard arrow navigation.
 *
 * @param {Array<{ id: string, label: string, badge?: React.ReactNode, icon?: React.ReactNode }>} tabs
 * @param {string} activeTab
 * @param {(id: string) => void} onChange
 */
export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = "pill", // "pill" | "underline"
  className = "",
}) {
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const activeButton = containerRef.current.querySelector(
      `button[data-tab-id="${activeTab}"]`
    );
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      });
    }
  }, [activeTab, tabs]);

  const handleKeyDown = (e, index) => {
    let nextIndex = index;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      onChange(nextTab.id);
      const nextBtn = containerRef.current?.querySelector(
        `button[data-tab-id="${nextTab.id}"]`
      );
      nextBtn?.focus();
    }
  };

  if (variant === "underline") {
    return (
      <div className={`relative border-b border-slate-200 dark:border-slate-800 ${className}`}>
        <div
          ref={containerRef}
          role="tablist"
          className="relative flex items-center gap-6 overflow-x-auto no-scrollbar"
        >
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                data-tab-id={tab.id}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`relative pb-3 pt-2 text-sm font-semibold transition-colors duration-150 inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-indigo-500 whitespace-nowrap ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.badge && <span className="shrink-0">{tab.badge}</span>}
              </button>
            );
          })}

          {/* Sliding underline */}
          <span
            aria-hidden="true"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
            className="absolute bottom-0 h-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-200 ease-out pointer-events-none"
          />
        </div>
      </div>
    );
  }

  // Pill variant
  return (
    <div
      ref={containerRef}
      role="tablist"
      className={`relative inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar max-w-full ${className}`}
    >
      {/* Sliding pill background */}
      <span
        aria-hidden="true"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
        className="absolute top-1 bottom-1 rounded-xl bg-white dark:bg-slate-900 shadow-sm transition-all duration-200 ease-out pointer-events-none"
      />

      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            data-tab-id={tab.id}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative z-10 inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-indigo-500 whitespace-nowrap ${
              isActive
                ? "text-slate-900 dark:text-slate-50"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span className="shrink-0">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

