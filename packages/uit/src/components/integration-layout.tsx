import { cn } from "@/styles/utils";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { AIChatButton } from "./ai-chat-button";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

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
        <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-1.5 sm:gap-2 px-2 sm:px-3">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {color && (
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex-shrink-0" style={{ backgroundColor: color }} />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-semibold leading-tight truncate">{title}</h1>
              {description && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="gap-1.5 sm:gap-2 px-2 sm:px-3"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            )}
            <AIChatButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className={cn("container mx-auto py-4 sm:py-6 px-3 sm:px-4 md:px-6", className)}>{children}</main>
    </div>
  );
}
