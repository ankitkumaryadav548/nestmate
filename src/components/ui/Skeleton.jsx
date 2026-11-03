"use client";

/**
 * Skeleton Component
 * Animated shimmering placeholder for loading states.
 */
export default function Skeleton({
  className = "",
  variant = "rectangular", // "rectangular" | "circular" | "text"
  width,
  height,
  style = {},
  ...props
}) {
  const variantStyles = {
    rectangular: "rounded-xl",
    circular: "rounded-full",
    text: "rounded-md h-3.5 my-1",
  };

  const inlineStyle = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      style={inlineStyle}
      className={`bg-slate-200/80 dark:bg-slate-800/80 animate-shimmer ${
        variantStyles[variant] || variantStyles.rectangular
      } ${className}`}
      {...props}
    />
  );
}

