"use client";

import { useEffect } from "react";

export function useDocumentTitle(title, isAdmin = false) {
  useEffect(() => {
    if (!title) return;
    const suffix = isAdmin ? "Admin | HostelMatch" : "HostelMatch";
    document.title = `${title} | ${suffix}`;
  }, [title, isAdmin]);
}

export default useDocumentTitle;

