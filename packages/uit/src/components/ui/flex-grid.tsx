import { cn } from "@/styles/utils";
import { type HTMLAttributes, forwardRef } from "react";

interface FlexGridProps extends HTMLAttributes<HTMLDivElement> {
  gap?: number;
  columns?: number;
}

const FlexGrid = forwardRef<HTMLDivElement, FlexGridProps>(
  ({ className, gap = 4, columns = 4, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "grid w-full",
          "min-h-[80vh]",
          // Dynamic columns based on screen size
          "grid-cols-1",
          "sm:grid-cols-2",
          "md:grid-cols-3",
          "lg:grid-cols-4",
          // Auto rows and dense packing
          "auto-rows-auto",
          "grid-flow-dense",
          // Spacing
          "gap-8",
          // Container control
          "px-4 mx-auto",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

FlexGrid.displayName = "FlexGrid";

export { FlexGrid, type FlexGridProps };
