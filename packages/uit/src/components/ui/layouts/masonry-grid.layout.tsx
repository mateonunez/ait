import { cn } from "@/styles/utils";
import { type HTMLAttributes, forwardRef } from "react";

interface FlexGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Gap between grid items in pixels. Default is 8. */
  gap?: number;
}

const FlexGrid = forwardRef<HTMLDivElement, FlexGridProps>(({ className, gap = 8, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      // A responsive grid with 1-4 columns and dense packing
      className={cn(
        "grid w-full min-h-[80vh] grid-flow-dense auto-rows-auto",
        "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        "px-4 mx-auto",
        className,
      )}
      // Use inline style to set a custom gap (Tailwind doesn’t allow dynamic gap-<value>)
      style={{ gap: `${gap}px` }}
      {...props}
    >
      {children}
    </div>
  );
});

FlexGrid.displayName = "FlexGrid";

export { FlexGrid, type FlexGridProps };
