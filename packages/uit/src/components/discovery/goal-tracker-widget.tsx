import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Edit2, Trash2, Flame } from "lucide-react";
import { useInsights } from "@/contexts/insights.context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { GoalData, GoalType, GoalPeriod, CreateGoalRequest } from "@ait/ai-sdk";

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
          <div className="text-center py-8 space-y-3">
            <p className="text-muted-foreground">No goals yet. Create one to get started!</p>
            <Button onClick={() => setIsCreateModalOpen(true)} variant="outline" size="sm">
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Your Goals</CardTitle>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className="relative rounded-lg border bg-card p-4 space-y-3 hover:shadow-md transition-shadow"
    >
      {/* Actions (shown on hover) */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-2 right-2 flex gap-1"
          >
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon */}
      <div className="flex items-center justify-center">
        <span className="text-4xl">{getGoalIcon()}</span>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {goal.current} / {goal.target}
          </span>
          <span className="text-muted-foreground">{goal.progress}%</span>
        </div>
        <Progress value={goal.progress} className="h-2" />
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-sm font-medium truncate">{goal.label || goal.type}</p>
        <p className="text-xs text-muted-foreground capitalize">{goal.period}</p>
      </div>

      {/* Streak */}
      {goal.streak > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center justify-center gap-1 text-sm"
        >
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="font-bold text-orange-500">{goal.streak}</span>
        </motion.div>
      )}

      {/* Completion indicator */}
      {isCompleted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
        >
          ✓
        </motion.div>
      )}
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
