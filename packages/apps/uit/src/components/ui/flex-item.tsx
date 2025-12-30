import { cn } from "@/styles/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface FlexItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
}

const sizeMinHeights: Record<NonNullable<FlexItemProps["size"]>, string> = {
  xs: "min-h-[20vh]",
  sm: "min-h-[28vh]",
  md: "min-h-[34vh]",
  lg: "min-h-[40vh]",
  xl: "min-h-[46vh]",
  full: "min-h-[34vh]",
};

const FlexItem = forwardRef<HTMLButtonElement, FlexItemProps>(
  ({ className, color = "#9333EA", size = "md", children, ...props }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        className={cn(
          // Basic shape + spacing
          "rounded-xl p-4 w-full",
          // Ensure each item “snaps” as a block in the grid
          "break-inside-avoid", // avoids splitting across columns in some browsers
          "transition-all duration-300 ease-in-out",
          "hover:scale-[0.98] hover:shadow-xl hover:brightness-110",
          "active:scale-95 active:brightness-90",
          // Use row spans for different sizes
          {
            // Extra small: 1×1
            "col-span-1 row-span-1": size === "xs",
            // Small: 1×2
            "col-span-1 row-span-2": size === "sm",
            // Medium: 2×2
            "col-span-1 md:col-span-2 row-span-2": size === "md",
            // Large: 2×3
            "col-span-1 md:col-span-2 row-span-3": size === "lg",
            // Extra large: 3×3
            "col-span-1 md:col-span-2 lg:col-span-3 row-span-3": size === "xl",
            // Full width: 4 columns (on lg) but shorter row span
            "col-span-1 md:col-span-2 lg:col-span-4 row-span-2": size === "full",
          },
          // Additional min-height for bigger cards
          sizeMinHeights[size],
          className,
        )}
        style={{
          backgroundColor: color,
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);

FlexItem.displayName = "FlexItem";

export { FlexItem, type FlexItemProps };
