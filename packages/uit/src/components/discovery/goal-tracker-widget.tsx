import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Edit2, Trash2, Flame } from "lucide-react";
import { useInsights } from "@/contexts/insights.context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { GoalData, GoalType, GoalPeriod, CreateGoalRequest } from "@ait/ai-sdk";
import { cn } from "@/styles/utils";

const GOAL_TYPE_OPTIONS: Array<{ value: GoalType; label: string; icon: string }> = [
  { value: "commits", label: "Commits", icon: "💻" },
  { value: "songs", label: "Songs", icon: "🎵" },
  { value: "messages", label: "Messages", icon: "💬" },
  { value: "tweets", label: "Tweets", icon: "🐦" },
  { value: "tasks", label: "Tasks", icon: "✅" },
  { value: "documents", label: "Documents", icon: "📝" },
];

const PERIOD_OPTIONS: Array<{ value: GoalPeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function GoalTrackerWidget() {
  const { goals, isLoadingGoals, createGoal, updateGoal, deleteGoal } = useInsights();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalData | null>(null);

  // Loading state
  if (isLoadingGoals && goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Your Goals</CardTitle>
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Your Goals</CardTitle>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <div className="p-4 bg-primary/5 rounded-full ring-1 ring-primary/10">
              <Target className="h-8 w-8 text-primary/40" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="font-semibold text-lg">No goals set yet</h3>
              <p className="text-muted-foreground text-sm">
                Set targets for your activities to track your progress and stay motivated.
              </p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} variant="outline" className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </div>
        </CardContent>

        <GoalFormModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={createGoal} />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">Your Goals</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground pl-11">Track your progress and build consistency</p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="rounded-full px-4 shadow-sm hover:shadow-md transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {goals.map((goal, index) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={index}
                  onEdit={() => setEditingGoal(goal)}
                  onDelete={() => deleteGoal(goal.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <GoalFormModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={createGoal} />

      {/* Edit Modal */}
      {editingGoal && (
        <GoalFormModal
          isOpen={!!editingGoal}
          onClose={() => setEditingGoal(null)}
          onSubmit={async (data) => {
            await updateGoal(editingGoal.id, data);
            setEditingGoal(null);
          }}
          initialData={editingGoal}
          isEditing
        />
      )}
    </>
  );
}

/**
 * Goal Card Component
 */
interface GoalCardProps {
  goal: GoalData;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function GoalCard({ goal, index, onEdit, onDelete }: GoalCardProps) {
  const [showActions, setShowActions] = useState(false);
  const isCompleted = goal.progress >= 100;

  const getGoalIcon = () => {
    if (goal.icon) return goal.icon;
    const typeOption = GOAL_TYPE_OPTIONS.find((opt) => opt.value === goal.type);
    return typeOption?.icon || "🎯";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={cn(
        "group relative overflow-hidden rounded-xl border p-5 transition-all duration-300",
        "bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm",
        "hover:shadow-lg hover:border-primary/20 hover:from-card/60 hover:to-card/40",
        isCompleted ? "border-green-500/30" : "border-border/50",
      )}
    >
      {/* Background Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl text-xl shadow-sm transition-transform group-hover:scale-105",
              "bg-background/80 backdrop-blur-md border border-border/50",
              isCompleted && "bg-green-500/10 border-green-500/20 text-green-600",
            )}
          >
            {isCompleted ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <title>Goal Completed</title>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              getGoalIcon()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold leading-none tracking-tight">{goal.label || goal.type}</p>
              {goal.streak > 0 && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                    "bg-orange-500/10 text-orange-600 border-orange-500/20",
                    "dark:bg-orange-500/20 dark:text-orange-400",
                  )}
                >
                  <Flame className="h-3 w-3 fill-orange-500" />
                  {goal.streak}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground capitalize mt-1">{goal.period}</p>
          </div>
        </div>

        {/* Actions - Now static position but visible on hover */}
        <div className={cn("flex gap-1 transition-opacity duration-200", showActions ? "opacity-100" : "opacity-0")}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-background/80"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{goal.current}</span>
            <span className="text-sm text-muted-foreground font-medium">/ {goal.target}</span>
          </div>
          <span className={cn("text-sm font-bold", isCompleted ? "text-green-500" : "text-primary")}>
            {Math.min(100, Math.round(goal.progress))}%
          </span>
        </div>

        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
          <motion.div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isCompleted
                ? "bg-gradient-to-r from-green-500 to-emerald-400"
                : "bg-gradient-to-r from-blue-500 to-violet-500",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, goal.progress)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Goal Form Modal
 */
interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGoalRequest) => Promise<void>;
  initialData?: Partial<GoalData>;
  isEditing?: boolean;
}

function GoalFormModal({ isOpen, onClose, onSubmit, initialData, isEditing }: GoalFormModalProps) {
  const [formData, setFormData] = useState<CreateGoalRequest>({
    type: initialData?.type || "commits",
    target: initialData?.target || 10,
    period: initialData?.period || "weekly",
    label: initialData?.label,
    icon: initialData?.icon,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        type: "commits",
        target: 10,
        period: "weekly",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Goal" : "Create New Goal"}</DialogTitle>
          <DialogDescription>Set a target for your activity and track your progress over time.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Goal Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as GoalType }))}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label htmlFor="target">Target</Label>
            <Input
              id="target"
              type="number"
              min="1"
              value={formData.target}
              onChange={(e) => setFormData((prev) => ({ ...prev, target: Number.parseInt(e.target.value, 10) }))}
              required
            />
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label htmlFor="period">Period</Label>
            <Select
              value={formData.period}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, period: value as GoalPeriod }))}
            >
              <SelectTrigger id="period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Label (Optional)</Label>
            <Input
              id="label"
              type="text"
              placeholder="e.g., Morning Commits"
              value={formData.label || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value || undefined }))}
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Goal" : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
