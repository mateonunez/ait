import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/styles/utils";
import { theme } from "@/styles/theme";

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  variant?: "hero" | "default";
  gradient?: boolean;
}

const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, variant = "default", gradient, ...props }, ref) => {
    const baseStyles = cn(
      theme.typography.heading.base,
      variant === "hero" && theme.typography.heading.hero,
      gradient && [
        theme.typography.gradient.base,
        theme.typography.gradient.animation,
        `bg-gradient-to-r ${theme.gradients.light} ${theme.gradients.dark}`,
        theme.animations.gradient,
        theme.animations.base,
        "hover:scale-[1.02] active:scale-[0.98]",
      ],
      className,
    );

    return <h1 ref={ref} className={baseStyles} {...props} />;
  },
);

Heading.displayName = "Heading";

export { Heading, type HeadingProps };
