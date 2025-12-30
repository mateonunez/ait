import { cn } from "@/styles/utils";
import type { TaskStep } from "@ait/core";
import { motion } from "framer-motion";
import { CheckCircle, Circle, ListChecks, Loader2, XCircle } from "lucide-react";
import { Badge } from "../ui/badge";

interface TaskManagerProps {
  tasks: TaskStep[];
  className?: string;
}

const statusIcons = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle,
  failed: XCircle,
};

const statusColors = {
  pending: "text-muted-foreground",
  in_progress: "text-blue-600 dark:text-blue-400",
  completed: "text-green-600 dark:text-green-400",
  failed: "text-red-600 dark:text-red-400",
};

export function TaskManager({ tasks, className }: TaskManagerProps) {
  if (tasks.length === 0) {
    return null;
  }

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const progress = (completedTasks / totalTasks) * 100;

  return (
    <div className={cn("rounded-lg border border-border bg-background p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Tasks</span>
        </div>
        <Badge variant="outline">
          {completedTasks}/{totalTasks}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-primary"
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">{progress.toFixed(0)}% complete</p>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <TaskCard key={task.id} task={task} index={index} />
        ))}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: TaskStep;
  index: number;
}

function TaskCard({ task, index }: TaskCardProps) {
  const Icon = statusIcons[task.status as keyof typeof statusIcons];
  const colorClass = statusColors[task.status as keyof typeof statusColors];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "flex gap-3 p-3 rounded-lg border transition-colors",
        task.status === "completed"
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
          : task.status === "failed"
            ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
            : "border-border bg-muted/30",
      )}
    >
      {/* Status icon */}
      <div className="flex-shrink-0 pt-0.5">
        <Icon className={cn("h-5 w-5", colorClass, task.status === "in_progress" && "animate-spin")} />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{task.description}</p>

        {task.result && <p className="text-xs text-muted-foreground line-clamp-2">{task.result}</p>}

        {task.error && <p className="text-xs text-red-600 dark:text-red-400">{task.error}</p>}

        {task.progress !== undefined && task.progress > 0 && task.progress < 100 && (
          <div className="mt-2">
            <div className="h-1 rounded-full bg-background overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Status badge */}
      <Badge variant="outline" className="text-xs capitalize">
        {task.status.replace("_", " ")}
      </Badge>
    </motion.div>
  );
}
