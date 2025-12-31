"use client";

import { cn } from "@/styles/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { applyInputReplacements } from "../../utils/input-replacements";

interface PromptInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  variant?: "default" | "floating";
  focusOnEnable?: boolean;
}

export function PromptInput({
  onSubmit,
  disabled = false,
  placeholder = "Ask AIt anything...",
  className,
  variant = "default",
  focusOnEnable = false,
}: PromptInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  });

  // Focus on enable
  useEffect(() => {
    if (!disabled && focusOnEnable && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [disabled, focusOnEnable]);

  const handleSubmit = useCallback(() => {
    if (!value.trim() || disabled) return;

    onSubmit(value);
    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const characterCount = value.length;
  const showCount = characterCount > 0;
  const hasContent = value.trim().length > 0;
  const isFloating = variant === "floating";

  return (
    <div className={cn("w-full max-w-5xl mx-auto", className)}>
      <div
        className={cn(
          "relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isFloating
            ? "bg-transparent border-0 shadow-none ring-0 focus-within:ring-0"
            : cn(
                "rounded-[32px] border border-border/40 bg-muted/20 backdrop-blur-2xl shadow-xl shadow-primary/5",
                isFocused
                  ? "border-primary/40 ring-4 ring-primary/5 bg-muted/30 shadow-2xl shadow-primary/10"
                  : "hover:border-border/60 hover:bg-muted/25",
              ),
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div className={cn("flex items-end gap-2 sm:gap-4", isFloating ? "p-3 sm:p-4" : "p-2 sm:p-2 sm:px-4")}>
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(applyInputReplacements(e.target.value))}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className={cn(
              "resize-none bg-transparent text-base sm:text-base leading-relaxed overflow-hidden",
              "flex-1 py-2 focus:outline-none placeholder:text-muted-foreground/50 transition-all font-normal",
              "disabled:cursor-not-allowed min-h-[40px] max-h-[240px]",
            )}
          />

          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
            {/* Send button */}
            {!isFloating && (
              <motion.button
                layout
                whileHover={hasContent ? { scale: 1.05 } : {}}
                whileTap={hasContent ? { scale: 0.95 } : {}}
                type="button"
                onClick={handleSubmit}
                disabled={disabled || !hasContent}
                className={cn(
                  "p-2 rounded-full transition-all duration-300 flex-shrink-0 relative overflow-hidden cursor-pointer",
                  hasContent
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-muted text-muted-foreground/30",
                  "disabled:cursor-not-allowed",
                )}
                title="Send to AIt"
              >
                <AnimatePresence mode="wait">
                  {disabled ? (
                    <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="send"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Send
                        className={cn("h-5 w-5 transition-transform", hasContent && "translate-x-0.5 -translate-y-0.5")}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )}
          </div>
        </div>

        {/* Character count */}
        {showCount && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -bottom-7 right-6 text-[10px] font-bold tracking-widest text-muted-foreground/20 uppercase pointer-events-none"
          >
            {characterCount} CHARS
          </motion.div>
        )}
      </div>

      {/* Hint text */}
      {!isFloating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-4 text-[9px] font-bold tracking-[0.2em] text-muted-foreground/20 mt-4 uppercase pointer-events-none"
        >
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded-md border border-border/20 bg-muted/5">Enter</kbd>
            <span>Send</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-border/20" />
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded-md border border-border/20 bg-muted/5">Shift + Enter</kbd>
            <span>Newline</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
