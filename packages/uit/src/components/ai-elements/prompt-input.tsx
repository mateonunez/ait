import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Paperclip, Mic } from "lucide-react";
import { cn } from "@/styles/utils";
import { motion } from "framer-motion";

interface PromptInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function PromptInput({
  onSubmit,
  disabled = false,
  placeholder = "Ask AIt anything...",
  className,
}: PromptInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  });

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;

    onSubmit(value);
    setValue("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const characterCount = value.length;
  const showCount = characterCount > 0;

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative rounded-2xl border-2 transition-all duration-200",
          "bg-background shadow-lg",
          isFocused ? "border-primary ring-4 ring-primary/10" : "border-border",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div className="flex items-end gap-1.5 sm:gap-2 p-2 sm:p-3">
          {/* Future: Attachment button */}
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0",
              "text-muted-foreground hover:text-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
            title="Attach file (coming soon)"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm",
              "focus:outline-none placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed min-h-[24px] max-h-[200px]",
            )}
          />

          {/* Future: Voice input button */}
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0",
              "text-muted-foreground hover:text-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
            title="Voice input (coming soon)"
          >
            <Mic className="h-4 w-4" />
          </button>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className={cn(
              "p-1.5 sm:p-2 rounded-lg transition-all duration-200 flex-shrink-0",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary",
            )}
            title="Send message"
          >
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>

        {/* Character count */}
        {showCount && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute -bottom-6 right-2 text-xs text-muted-foreground"
          >
            {characterCount}
          </motion.div>
        )}
      </div>

      {/* Hint text */}
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-1.5 sm:mt-2">
        Press{" "}
        <kbd className="px-1 sm:px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] sm:text-xs">Enter</kbd>{" "}
        to send,{" "}
        <kbd className="px-1 sm:px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] sm:text-xs">
          Shift + Enter
        </kbd>{" "}
        for new line
      </p>
    </div>
  );
}
