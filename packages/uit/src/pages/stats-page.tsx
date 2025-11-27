import { StatsContent } from "@/components/stats/stats-content";
import { Button } from "@/components/ui/button";
import { StatsProvider } from "@/contexts/stats.context";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function StatsPage() {
  return (
    <StatsProvider>
      <div className="min-h-screen bg-background p-6 space-y-6">
        <div className="flex items-center justify-between">
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

        <div className="h-[600px]">
          <StatsContent />
        </div>
      </div>
    </StatsProvider>
  );
}
