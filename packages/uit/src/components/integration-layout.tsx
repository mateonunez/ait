import { ArrowLeft, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { AIChatButton } from "./ai-chat-button";
import { cn } from "@/styles/utils";
import type { ReactNode } from "react";

interface IntegrationLayoutProps {
  title: string;
  description?: string;
  color?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children: ReactNode;
  className?: string;
}

export function IntegrationLayout({
  title,
  description,
  color,
  onRefresh,
  isRefreshing,
  children,
  className,
}: IntegrationLayoutProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>

          <div className="flex items-center gap-3 flex-1">
            {color && <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: color }} />}
            <div>
              <h1 className="text-lg font-semibold leading-none">{title}</h1>
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span>Refresh</span>
              </Button>
            )}
            <AIChatButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className={cn("container mx-auto py-6 px-6", className)}>{children}</main>
    </div>
  );
}
