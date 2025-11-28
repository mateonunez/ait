import { useLocation } from "wouter";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/styles/utils";
import { AIT_SERVICES } from "@/utils/items.const";
import {
  Github,
  Music,
  MessageSquare,
  FileText,
  Code2,
  Zap,
  Video,
  Palette,
  Cloud,
  CreditCard,
  Twitter,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const enabledIntegrations = AIT_SERVICES.filter((service) => !service.disabled);
  const disabledIntegrations = AIT_SERVICES.filter((service) => service.disabled);

  const handleIntegrationClick = (route?: string) => {
    if (route) {
      setLocation(route);
    }
  };

  return (
    <div className="w-full">
      <div className="container mx-auto max-w-7xl space-y-4">
        {/* Enabled Integrations */}
        {enabledIntegrations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Available Integrations</h3>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 sm:gap-3 py-2">
                {enabledIntegrations.map((integration) => {
                  const IconComponent = INTEGRATION_ICONS[integration.id] || Code2;

                  return (
                    <button
                      key={integration.id}
                      type="button"
                      onClick={() => handleIntegrationClick(integration.route)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg",
                        "w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] shrink-0",
                        "border border-transparent hover:border-white/20",
                        "transition-all duration-200 hover:scale-105 hover:shadow-xl",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                      )}
                      style={{
                        backgroundColor: integration.color,
                      }}
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 bg-white/10 backdrop-blur-sm">
                        <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <p className="text-xs sm:text-sm font-semibold leading-tight text-white text-center whitespace-normal">
                        {integration.title}
                      </p>
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* Coming Soon Integrations */}
        {disabledIntegrations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-muted-foreground">Coming Soon</h3>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 sm:gap-3 py-2">
                {disabledIntegrations.map((integration) => {
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
