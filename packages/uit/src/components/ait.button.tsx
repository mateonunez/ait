import { type ButtonHTMLAttributes, useState } from "react";
import { cn } from "@/styles/utils";
import { theme } from "@/styles/theme";
import AItDialog from "./ait.dialog";

interface AItButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function AItButton({ label = "AIt", className, ...props }: Readonly<AItButtonProps>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" aria-label="AIt button" onClick={() => setOpen(true)} {...props}>
        <span
          className={cn(
            "relative inline-block origin-center p-4 rounded-lg cursor-pointer",
            "mx-2",
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

      <AItDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
