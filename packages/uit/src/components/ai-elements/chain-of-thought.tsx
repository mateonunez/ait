import { Brain, Lightbulb, Play, CheckCircle } from "lucide-react";
import { cn } from "@/styles/utils";
import { Badge } from "../ui/badge";
import type { ReasoningStep } from "@ait/core";
import { motion } from "framer-motion";

interface ChainOfThoughtProps {
  steps: ReasoningStep[];
  className?: string;
}

const stepIcons = {
  analysis: Lightbulb,
  planning: Brain,
  execution: Play,
  reflection: CheckCircle,
};

const stepColors = {
  analysis: "text-blue-600 dark:text-blue-400",
  planning: "text-purple-600 dark:text-purple-400",
  execution: "text-green-600 dark:text-green-400",
  reflection: "text-orange-600 dark:text-orange-400",
};

export function ChainOfThought({ steps, className }: ChainOfThoughtProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-lg border border-border bg-background p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Chain of Thought</span>
        <Badge variant="outline">{steps.length} steps</Badge>
      </div>

      {/* Timeline */}
      <div className="relative space-y-4">
        {/* Connecting line */}
        <div className="absolute left-4 top-8 bottom-8 w-px bg-border" />

        {steps.map((step, index) => (
          <ReasoningStepCard key={step.id} step={step} index={index} isLast={index === steps.length - 1} />
        ))}
      </div>
    </div>
  );
}

interface ReasoningStepCardProps {
  step: ReasoningStep;
  index: number;
  isLast: boolean;
}

function ReasoningStepCard({ step, index, isLast }: ReasoningStepCardProps) {
  const Icon = stepIcons[step.type as keyof typeof stepIcons];
  const colorClass = stepColors[step.type as keyof typeof stepColors];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative flex gap-3"
    >
      {/* Step number/icon */}
      <div
        className={cn(
          "relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          "bg-background border-2 border-border",
          !isLast && "shadow-sm",
        )}
      >
        <Icon className={cn("h-4 w-4", colorClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs capitalize">
            {step.type}
          </Badge>
          {step.confidence !== undefined && (
            <span className="text-xs text-muted-foreground">{(step.confidence * 100).toFixed(0)}% confidence</span>
          )}
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{step.content}</p>
      </div>
    </motion.div>
  );
}
