import { StatsContent } from "@/components/stats/stats-content";
import { Button } from "@/components/ui/button";
import { StatsProvider } from "@/contexts/stats.context";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function StatsPage() {
  return (
    <StatsProvider>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-background flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">System Analytics</h1>
              <p className="text-muted-foreground">Detailed metrics and performance insights</p>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <StatsContent />
        </div>
      </div>
    </StatsProvider>
  );
}
