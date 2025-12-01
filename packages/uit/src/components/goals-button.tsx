import { useInsights } from "@/contexts/insights.context";
import { Target } from "lucide-react";
import { useState } from "react";
import { GoalsDialog } from "./discovery/goals-dialog";
import { Button } from "./ui/button";

export function GoalsButton() {
  const { goals } = useInsights();
  const [isOpen, setIsOpen] = useState(false);
  const activeGoalsCount = goals.filter((g) => g.progress < 100).length;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative group"
        title="Your Goals"
      >
        <Target className="h-[1.2rem] w-[1.2rem] transition-all group-hover:scale-110" />
        {activeGoalsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {activeGoalsCount}
          </span>
        )}
        <span className="absolute inset-0 rounded-md bg-linear-to-r from-orange-500/20 to-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Button>
      <GoalsDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
