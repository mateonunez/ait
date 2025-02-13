import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/styles/utils";
import { theme } from "@/styles/theme";

interface AItButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function AItButton({ label = "AIt", className, ...props }: AItButtonProps) {
  return (
    <button type="button" aria-label="AIt button" {...props}>
      <span
        className={cn(
          "relative inline-block origin-center p-2 sm:p-3 rounded-lg cursor-pointer",
          "mx-1 sm:mx-2",
          theme.typography.gradient.base,
          `bg-gradient-to-r ${theme.gradients.light} ${theme.gradients.dark}`,
          theme.animations.base,
          theme.animations.scale,
          "after:absolute after:inset-0 after:rounded-lg",
          "after:ring-2",
          "after:ring-slate-500/40 dark:after:ring-rose-400/20",
          "after:transition-transform after:duration-300",
          "hover:after:scale-105 active:after:scale-95",
          className,
        )}
      >
        {label}
      </span>
    </button>
  );
}
