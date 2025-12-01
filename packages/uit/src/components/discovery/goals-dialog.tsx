import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoalTrackerWidget } from "./goal-tracker-widget";

interface GoalsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalsDialog({ isOpen, onOpenChange }: GoalsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your Goals</DialogTitle>
          <DialogDescription>Track your progress and stay motivated with personalized goals.</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <GoalTrackerWidget />
        </div>
      </DialogContent>
    </Dialog>
  );
}
