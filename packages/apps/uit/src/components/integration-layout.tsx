import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { cn } from "@/styles/utils";
import type { IntegrationVendor } from "@ait/core";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { RefreshControl, type RefreshEntity } from "./common/refresh-control";
import { Button } from "./ui/button";

interface IntegrationLayoutProps {
  vendor: IntegrationVendor;
  title: string;
  description?: string;
  color?: string;
  onRefresh?: (selectedIds?: string[]) => void;
  availableEntities?: RefreshEntity[];
  activeEntityId?: string;
  isRefreshing?: boolean;
  children: ReactNode;
  className?: string;
}

export function IntegrationLayout({
  vendor,
  title,
  description,
  color,
  onRefresh,
  availableEntities,
  activeEntityId,
  isRefreshing,
  children,
  className,
}: IntegrationLayoutProps) {
  const [, setLocation] = useLocation();
  const { isVendorGranted, isLoading: isStatusLoading } = useConnectionStatus();

  const isGranted = isVendorGranted(vendor);

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
            {onRefresh && isGranted && (
              <RefreshControl
                onRefresh={onRefresh}
                availableEntities={availableEntities}
                activeEntityId={activeEntityId}
                isRefreshing={isRefreshing}
              />
            )}
          </div>
        </div>
      </header>

      <main className={cn("container mx-auto py-4 sm:py-6 px-3 sm:px-4 md:px-6", className)}>
        {isStatusLoading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="h-10 w-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Checking authorization...</p>
          </div>
        ) : !isGranted ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl"
              style={{ backgroundColor: color || "#6366f1" }}
            >
              <RefreshCw className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Connection Required</h2>
            <p className="text-muted-foreground mb-8 text-balance">
              Authorize <strong>{title}</strong> to view your data and integrate it with your AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={() => setLocation("/connections")} className="flex-1 bg-violet-600 hover:bg-violet-700">
                Connect {title}
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")} className="flex-1">
                Go Dashboard
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
