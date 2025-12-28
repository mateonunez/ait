import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsights } from "@/contexts/insights.context";
import { cn } from "@/styles/utils";
import type { CreateGoalRequest, GoalData, GoalPeriod, GoalType } from "@ait/core";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronRight, Edit2, Flame, Plus, Target, Trash2, TrendingUp, Trophy, Zap } from "lucide-react";
import { useState } from "react";

const GOAL_TYPE_OPTIONS: Array<{ value: GoalType; label: string; icon: string; color: string }> = [
  { value: "commits", label: "Commits", icon: "💻", color: "#F97316" },
  { value: "songs", label: "Songs", icon: "🎵", color: "#1DB954" },
  { value: "messages", label: "Messages", icon: "💬", color: "#E01E5A" },
  { value: "tweets", label: "Tweets", icon: "🐦", color: "#1DA1F2" },
  { value: "tasks", label: "Tasks", icon: "✅", color: "#5E6AD2" },
  { value: "documents", label: "Documents", icon: "📝", color: "#787774" },
  { value: "meetings", label: "Meetings", icon: "📅", color: "#4285F4" },
  { value: "subscription", label: "Subscriptions", icon: "📺", color: "#FF0000" },
  { value: "google_contact", label: "Contacts", icon: "👤", color: "#4285F4" },
];

const PERIOD_OPTIONS: Array<{ value: GoalPeriod; label: string; icon: typeof Calendar }> = [
  { value: "daily", label: "Daily", icon: Calendar },
  { value: "weekly", label: "Weekly", icon: Calendar },
  { value: "monthly", label: "Monthly", icon: Calendar },
];

export function GoalTrackerWidget() {
  const { goals, isLoadingGoals, createGoal, updateGoal, deleteGoal } = useInsights();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalData | null>(null);

  // Calculate stats
  const completedGoals = goals.filter((g) => g.progress >= 100).length;
  const totalStreak = goals.reduce((sum, g) => sum + g.streak, 0);
  const avgProgress =
    goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + Math.min(100, g.progress), 0) / goals.length) : 0;

  // Loading state
  if (isLoadingGoals && goals.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-primary/5 via-background to-background backdrop-blur-sm">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (goals.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/50 bg-linear-to-br from-violet-500/5 via-background to-background">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-violet-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-linear-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative p-8 sm:p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-violet-500/20 rounded-2xl blur-xl animate-pulse" />
              <div className="relative p-5 bg-linear-to-br from-violet-500/20 to-blue-500/20 rounded-2xl border border-violet-500/30">
                <Target className="h-10 w-10 text-violet-400" />
              </div>
            </motion.div>

            <div className="space-y-2">
              <h3 className="font-bold text-xl">Set Your First Goal</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Track your daily, weekly, or monthly progress. Set targets for commits, songs, messages, and more!
              </p>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2 bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                size="lg"
              >
                <Plus className="h-5 w-5" />
                Create Your First Goal
              </Button>
            </motion.div>

            {/* Suggested goals */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {GOAL_TYPE_OPTIONS.slice(0, 4).map((type) => (
                <Badge
                  key={type.value}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-violet-500/10 transition-colors"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <span className="mr-1">{type.icon}</span>
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <GoalFormModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={createGoal} />
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-primary/5 via-background to-background backdrop-blur-sm">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-emerald-500/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-lg" />
                  <div className="relative p-3 rounded-xl bg-linear-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                    <Target className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-xl flex items-center gap-2">
                    Your Goals
                    {completedGoals > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      >
                        <Trophy className="h-3 w-3 mr-1" />
                        {completedGoals} completed
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">Track progress and build consistency</p>
                </div>
              </div>

              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
              >
                <Plus className="h-4 w-4" />
                Add Goal
              </Button>
            </div>

            {/* Quick Stats */}
            {goals.length > 0 && (
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-muted-foreground">Avg Progress:</span>
                  <span className="font-bold">{avgProgress}%</span>
                </div>
                {totalStreak > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                      <Flame className="h-4 w-4 text-orange-400" />
                    </div>
                    <span className="text-muted-foreground">Total Streak:</span>
                    <span className="font-bold">{totalStreak} days</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <div className="p-1.5 rounded-lg bg-violet-500/10">
                    <Zap className="h-4 w-4 text-violet-400" />
                  </div>
                  <span className="text-muted-foreground">Active Goals:</span>
                  <span className="font-bold">{goals.length}</span>
                </div>
              </div>
            )}
          </div>

          {/* Goals Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
          </div>
        </div>
      </div>

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
  const [isHovered, setIsHovered] = useState(false);
  const isCompleted = goal.progress >= 100;

  const typeOption = GOAL_TYPE_OPTIONS.find((opt) => opt.value === goal.type);
  const goalColor = typeOption?.color || "#6B7280";
  const goalIcon = goal.icon || typeOption?.icon || "🎯";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all duration-300",
        "bg-linear-to-br from-card/80 to-card/50 backdrop-blur-sm",
        isCompleted
          ? "border-emerald-500/40 shadow-lg shadow-emerald-500/10"
          : "border-border/50 hover:border-primary/30 hover:shadow-lg",
      )}
      style={{
        boxShadow: isHovered && !isCompleted ? `0 8px 30px ${goalColor}15` : undefined,
      }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-opacity duration-300"
        style={{
          backgroundColor: isCompleted ? "#10B981" : goalColor,
          opacity: isHovered || isCompleted ? 1 : 0.5,
        }}
      />

      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${goalColor}10 0%, transparent 60%)`,
        }}
      />

      <div className="relative p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className={cn(
                "flex items-center justify-center w-11 h-11 rounded-xl text-xl",
                "bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm",
                isCompleted && "bg-emerald-500/10 border-emerald-500/30",
              )}
              whileHover={{ scale: 1.05 }}
              style={{
                boxShadow: isHovered ? `0 4px 20px ${goalColor}20` : undefined,
              }}
            >
              {isCompleted ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                  <Trophy className="h-5 w-5 text-emerald-500" />
                </motion.div>
              ) : (
                goalIcon
              )}
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{goal.label || goal.type}</p>
                {goal.streak > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20"
                  >
                    <Flame className="h-3 w-3" />
                    {goal.streak}
                  </motion.div>
                )}
              </div>
              <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {goal.period}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div
            className={cn(
              "flex gap-1 transition-all duration-200",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2",
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-background/80"
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
              className="h-7 w-7 rounded-lg hover:bg-red-500/10 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1.5">
              <motion.span
                key={goal.current}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold tabular-nums tracking-tight"
              >
                {goal.current}
              </motion.span>
              <span className="text-sm text-muted-foreground font-medium">/ {goal.target}</span>
            </div>
            <span
              className={cn("text-sm font-bold", isCompleted ? "text-emerald-500" : "text-foreground")}
              style={{ color: !isCompleted ? goalColor : undefined }}
            >
              {Math.min(100, Math.round(goal.progress))}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary/50">
            <motion.div
              className={cn("h-full rounded-full", isCompleted && "bg-linear-to-r from-emerald-500 to-teal-400")}
              style={{
                backgroundColor: !isCompleted ? goalColor : undefined,
                boxShadow: `0 0 10px ${isCompleted ? "#10B981" : goalColor}50`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, goal.progress)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />

            {/* Animated shine effect */}
            {goal.progress > 0 && goal.progress < 100 && (
              <motion.div
                className="absolute inset-y-0 w-20 bg-linear-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "400%"] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              />
            )}
          </div>
        </div>

        {/* Completion badge */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-500"
          >
            <Trophy className="h-3.5 w-3.5" />
            Goal Achieved!
          </motion.div>
        )}
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

  const selectedType = GOAL_TYPE_OPTIONS.find((t) => t.value === formData.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
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
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="relative px-6 pt-6 pb-4 bg-linear-to-br from-emerald-500/10 via-background to-background">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-emerald-500/20 to-transparent rounded-full blur-2xl" />
          </div>
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Target className="h-5 w-5 text-emerald-400" />
              </div>
              <DialogTitle className="text-xl">{isEditing ? "Edit Goal" : "Create New Goal"}</DialogTitle>
            </div>
            <DialogDescription>Set a target for your activity and track your progress over time.</DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Goal Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Goal Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData((prev: CreateGoalRequest) => ({ ...prev, type: option.value }))}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200",
                    formData.type === option.value
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border/50 hover:border-border hover:bg-muted/50",
                  )}
                >
                  <span className="text-xl">{option.icon}</span>
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target & Period Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target" className="text-sm font-medium">
                Target
              </Label>
              <Input
                id="target"
                type="number"
                min="1"
                value={formData.target}
                onChange={(e) =>
                  setFormData((prev: CreateGoalRequest) => ({
                    ...prev,
                    target: Number.parseInt(e.target.value, 10) || 1,
                  }))
                }
                className="text-center text-lg font-semibold"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period" className="text-sm font-medium">
                Period
              </Label>
              <Select
                value={formData.period}
                onValueChange={(value) =>
                  setFormData((prev: CreateGoalRequest) => ({ ...prev, period: value as GoalPeriod }))
                }
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
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label" className="text-sm font-medium">
              Custom Label <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="label"
              type="text"
              placeholder={`e.g., Morning ${selectedType?.label || "Activity"}`}
              value={formData.label || ""}
              onChange={(e) =>
                setFormData((prev: CreateGoalRequest) => ({ ...prev, label: e.target.value || undefined }))
              }
            />
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-background border border-border/50">
                <span className="text-xl">{selectedType?.icon || "🎯"}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{formData.label || selectedType?.label || formData.type}</p>
                <p className="text-xs text-muted-foreground">
                  {formData.target} {selectedType?.label?.toLowerCase() || "items"} per {formData.period?.slice(0, -2)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <Zap className="h-4 w-4" />
                  </motion.div>
                  Saving...
                </>
              ) : (
                <>
                  {isEditing ? "Update Goal" : "Create Goal"}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
