import { PromptInput } from "@/components/ai-elements/prompt-input";
import { cn } from "@/styles/utils";
import { motion } from "framer-motion";

interface FloatingPromptButtonProps {
  onClick: () => void;
  onSubmit: () => void;
}

export function FloatingPromptButton({ onClick, onSubmit }: FloatingPromptButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-6 sm:bottom-8 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8 pointer-events-none"
    >
      <div className="container mx-auto max-w-xl">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "relative w-full cursor-pointer pointer-events-auto",
            "rounded-2xl overflow-hidden transition-all duration-300",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-transparent",

            // Blur and saturation
            "backdrop-blur-[40px] backdrop-saturate-[180%]",
            "dark:backdrop-blur-[40px] dark:backdrop-saturate-[200%]",

            // LIGHT MODE, bright glass
            "bg-gradient-to-br",
            "from-white/[0.25] via-white/[0.15] to-white/[0.08]",

            // DARK MODE, darkest possible glass
            "dark:bg-gradient-to-br",
            "dark:from-black/[0.12] dark:via-black/[0.06] dark:to-black/[0.02]",

            // Borders
            "border border-white/40",
            "dark:border-black/18",

            // Shadows
            "shadow-[0_8px_32px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.03)]",
            "dark:shadow-[0_10px_36px_rgba(0,0,0,0.85)]",

            // Hover
            "hover:backdrop-blur-[50px] hover:backdrop-saturate-[200%]",
            "dark:hover:backdrop-blur-[50px] dark:hover:backdrop-saturate-[220%]",

            "hover:bg-gradient-to-br",
            "hover:from-white/[0.35] hover:via-white/[0.22] hover:to-white/[0.12]",
            "dark:hover:bg-gradient-to-br",
            "dark:hover:from-black/[0.16] dark:hover:via-black/[0.09] dark:hover:to-black/[0.04]",

            "hover:border-white/50",
            "dark:hover:border-white/10",

            "hover:shadow-[0_12px_48px_rgba(0,0,0,0.08),0_6px_24px_rgba(0,0,0,0.04)]",
            "dark:hover:shadow-[0_14px_52px_rgba(0,0,0,0.95)]",

            // Top reflection
            "before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none",
            "before:bg-gradient-to-b before:from-white/[0.2] before:via-white/[0.08] before:to-transparent",
            "dark:before:bg-gradient-to-b dark:before:from-gray-500/[0.1] dark:before:via-gray-500/[0.02] dark:before:to-transparent",

            // Bottom inner glow
            "after:absolute after:inset-[1px] after:rounded-2xl after:pointer-events-none",
            "after:bg-gradient-to-t after:from-transparent after:via-transparent after:to-white/[0.08]",
            "dark:after:bg-gradient-to-t dark:after:from-transparent dark:after:via-transparent dark:after:to-white/[0.03]",
          )}
          aria-label="Ask AIt anything..."
        >
          <PromptInput
            onSubmit={onSubmit}
            className="max-w-full pointer-events-none"
            disabled={true}
            variant="floating"
          />
        </button>
      </div>
    </motion.div>
  );
}
