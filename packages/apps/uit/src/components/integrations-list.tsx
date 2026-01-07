import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { cn } from "@/styles/utils";
import { AIT_SERVICES } from "@/utils/items.const";
import {
  Calendar,
  Cloud,
  Code2,
  CreditCard,
  FileText,
  Github,
  MessageSquare,
  Music,
  Palette,
  Twitter,
  Video,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";

const INTEGRATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  spotify: Music,
  x: Twitter,
  linear: Zap,
  notion: FileText,
  slack: MessageSquare,
  google: Calendar,
  discord: MessageSquare,
  youtube: Video,
  vercel: Cloud,
  figma: Palette,
  aws: Cloud,
  stripe: CreditCard,
};

export function IntegrationsList() {
  const [, setLocation] = useLocation();
  const { isVendorEnabled, isVendorGranted, isLoading } = useConnectionStatus();

  const authorizedIntegrations = AIT_SERVICES.filter((service) => {
    if (service.disabled) return false;
    return isVendorGranted(service.id as any);
  });

  const comingSoonIntegrations = AIT_SERVICES.filter((service) => {
    if (service.disabled) return true;
    return !isVendorEnabled(service.id as any);
  });

  const handleIntegrationClick = (route?: string) => {
    if (route) {
      setLocation(route);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="container mx-auto max-w-7xl space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-7 w-48" />
            <div className="flex gap-2 sm:gap-3 py-2 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] rounded-xl shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="container mx-auto max-w-7xl space-y-4">
        {/* Connected Services (Authorized) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">My Integrations</h3>
            <button
              type="button"
              onClick={() => setLocation("/connections")}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              Manage Connections
            </button>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 sm:gap-3 py-2">
              {authorizedIntegrations.map((integration) => {
                const IconComponent = INTEGRATION_ICONS[integration.id] || Code2;

                return (
                  <button
                    key={integration.id}
                    type="button"
                    onClick={() => handleIntegrationClick(integration.route)}
                    className={cn(
                      "group relative flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl",
                      "w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] shrink-0",
                      "border border-white/10 hover:border-white/30",
                      "transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-md",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                    )}
                    style={{
                      backgroundColor: integration.color,
                    }}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 bg-white/20 backdrop-blur-md shadow-inner">
                      <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold leading-tight text-white text-center whitespace-normal">
                      {integration.title}
                    </p>
                  </button>
                );
              })}

              {/* Add Integration Button */}
              <button
                type="button"
                onClick={() => setLocation("/connections")}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl",
                  "w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] shrink-0",
                  "border border-dashed border-white/20 hover:border-white/40 bg-white/5",
                  "transition-all duration-300 hover:scale-105",
                )}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-white/10">
                  <span className="text-xl font-light text-white">+</span>
                </div>
                <p className="text-[10px] sm:text-xs font-medium text-white/60">Add New</p>
              </button>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Coming Soon Integrations */}
        {comingSoonIntegrations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-muted-foreground">Coming Soon</h3>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 sm:gap-3 py-2">
                {comingSoonIntegrations.map((integration) => {
                  const IconComponent = INTEGRATION_ICONS[integration.id] || Code2;

                  return (
                    <div
                      key={integration.id}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg",
                        "w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] shrink-0",
                        "border border-transparent opacity-60",
                        "cursor-not-allowed",
                      )}
                      style={{
                        backgroundColor: integration.color,
                      }}
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-white/10 backdrop-blur-sm">
                        <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <div className="flex flex-col items-center justify-center gap-1">
                        <p className="text-xs sm:text-sm font-semibold leading-tight text-white text-center whitespace-normal">
                          {integration.title}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-white/20 text-white border-white/30"
                        >
                          Soon
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
