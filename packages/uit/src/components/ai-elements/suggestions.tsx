import { Sparkles, ArrowRight, ChevronUp } from "lucide-react";
import { cn } from "@/styles/utils";
import type { SuggestionItem } from "@ait/core";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SuggestionsProps {
  suggestions: SuggestionItem[];
  onSuggestionClick: (suggestion: SuggestionItem) => void;
  className?: string;
  variant?: "default" | "simple";
  defaultOpen?: boolean;
}

export function Suggestions({
  suggestions,
  onSuggestionClick,
  className,
  variant = "default",
  defaultOpen = false,
}: SuggestionsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (suggestions.length === 0) {
    return null;
  }

  if (variant === "simple") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", className)}>
        {suggestions.map((suggestion, index) => (
          <SuggestionButton
            key={suggestion.id}
            suggestion={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            index={index}
          />
        ))}
      </div>
    );
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("rounded-lg border border-border bg-background", className)}
    >
      <CollapsibleTrigger className="w-full p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Suggestions</span>
          </div>
          <ChevronUp
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "transform rotate-180",
            )}
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="flex flex-wrap gap-2 pt-2">
          {suggestions.map((suggestion, index) => (
            <SuggestionButton
              key={suggestion.id}
              suggestion={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              index={index}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
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

  const typeColors: Record<string, string> = {
    question: "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950 dark:hover:border-blue-800",
    action: "hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-950 dark:hover:border-green-800",
    tool: "hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-950 dark:hover:border-purple-800",
    related: "hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-950 dark:hover:border-orange-800",
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center justify-start gap-2 px-4 py-3 rounded-lg",
        "border border-border bg-background",
        "transition-all duration-200",
        "hover:shadow-sm active:scale-[0.98]",
        "text-left w-full",
        typeColors[suggestion.type],
      )}
    >
      {IconComponent && (
        <IconComponent className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
      )}
      <span className="text-sm flex-1">{suggestion.text}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
    </motion.button>
  );
}
