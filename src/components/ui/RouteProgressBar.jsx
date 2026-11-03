"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * RouteProgressBar
 * Ultra-lightweight top gradient bar that animates when the URL changes.
 */
export default function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => {
      setAnimating(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!animating) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] h-0.5 pointer-events-none overflow-hidden"
    >
      <div className="h-full w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 animate-pulse origin-left duration-300 transition-all" />
    </div>
  );
}

