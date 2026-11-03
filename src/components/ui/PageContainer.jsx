"use client";

/**
 * PageContainer Component
 * Provides unified responsive maximum width, horizontal padding, and vertical rhythm.
 */
export default function PageContainer({
  maxWidth = "max-w-7xl",
  className = "",
  children,
  ...props
}) {
  return (
    <div
      className={`mx-auto w-full ${maxWidth} px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

