import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/styles/utils";

interface FlexItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
}

const FlexItem = forwardRef<HTMLButtonElement, FlexItemProps>(
  ({ className, color = "bg-purple-600", size = "md", children, ...props }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        className={cn(
          "rounded-xl p-4",
          // Interactive states
          "transition-all duration-300 ease-in-out",
          "hover:scale-[0.98] hover:shadow-xl hover:brightness-110",
          "active:scale-95 active:brightness-90",
          "focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-neutral-900",
          // Base styles
          "flex items-center justify-center",
          "cursor-pointer",
          "w-full min-h-[20vh]",
          // Grid span classes based on size
          {
            // Extra small (1 column)
            "col-span-1 row-span-1": size === "xs",
            // Small (1 column, taller)
            "col-span-1 row-span-2": size === "sm",
            // Medium (2 columns on larger screens)
            "col-span-1 md:col-span-2 row-span-1": size === "md",
            // Large (2 columns, taller)
            "col-span-1 md:col-span-2 row-span-2": size === "lg",
            // Extra large (3 columns where possible)
            "col-span-1 md:col-span-2 lg:col-span-3 row-span-2": size === "xl",
            // Full width (all columns)
            "col-span-1 md:col-span-2 lg:col-span-4 row-span-1": size === "full",
          },
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
