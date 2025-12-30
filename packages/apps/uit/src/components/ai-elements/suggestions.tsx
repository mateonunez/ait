import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/styles/utils";
import type { SuggestionItem } from "@ait/core";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";

interface SuggestionsProps {
  suggestions: SuggestionItem[];
  onSuggestionClick: (suggestion: SuggestionItem) => void;
  className?: string;
  variant?: "default" | "simple";
  isLoading?: boolean;
}

export function Suggestions({ suggestions, onSuggestionClick, className, isLoading }: SuggestionsProps) {
  if (isLoading) {
    return (
      <ScrollArea className={cn("w-full whitespace-nowrap", className)}>
        <div className="flex w-max space-x-2 pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: it's ok
            <div key={i} className="h-8 w-32 rounded-full border border-border bg-muted/50 animate-pulse" />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <ScrollArea className={cn("w-full whitespace-nowrap", className)}>
      <div className="flex w-max space-x-2 pb-2">
        {suggestions.map((suggestion, index) => (
          <SuggestionButton
            key={suggestion.id}
            suggestion={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            index={index}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="invisible" />
    </ScrollArea>
  );
}

interface SuggestionButtonProps {
  suggestion: SuggestionItem;
  onClick: () => void;
  index: number;
}

function SuggestionButton({ suggestion, onClick, index }: SuggestionButtonProps) {
  // Dynamically get icon from lucide-react
  const IconComponent = suggestion.icon ? (Icons as any)[suggestion.icon] : null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
        "text-xs sm:text-sm font-medium transition-colors",
        "border border-border bg-background hover:bg-muted/50",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "cursor-pointer select-none",
      )}
    >
      {IconComponent && <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />}
      <span>{suggestion.text}</span>
    </motion.button>
  );
}
