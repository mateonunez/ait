import { useLocation } from "wouter";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const INTEGRATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  spotify: Music,
  "x-twitter": Twitter,
  linear: Zap,
  notion: FileText,
  slack: MessageSquare,
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
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl space-y-4">
        {/* Enabled Integrations */}
        {enabledIntegrations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Available Integrations</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {enabledIntegrations.map((integration) => {
                const IconComponent = INTEGRATION_ICONS[integration.id] || Code2;

                return (
                  <button
                    key={integration.id}
                    type="button"
                    onClick={() => handleIntegrationClick(integration.route)}
                    className={cn(
                      "group relative flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl",
                      "border border-border/50 bg-card/50 hover:bg-card hover:border-border",
                      "transition-all duration-200 hover:scale-105 hover:shadow-lg",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                  >
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: integration.color }}
                    >
                      <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="text-center space-y-0.5">
                      <p className="text-sm font-semibold leading-tight">{integration.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{integration.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Coming Soon Integrations */}
        {disabledIntegrations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-muted-foreground">Coming Soon</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {disabledIntegrations.map((integration) => {
                const IconComponent = INTEGRATION_ICONS[integration.id] || Code2;

                return (
                  <div
                    key={integration.id}
                    className={cn(
                      "group relative flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl",
                      "border border-border/30 bg-muted/30 opacity-60",
                      "cursor-not-allowed",
                    )}
                  >
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: integration.color }}
                    >
                      <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="text-center space-y-0.5">
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-sm font-semibold leading-tight">{integration.title}</p>
                        <Badge variant="secondary" className="text-xs">
                          Soon
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{integration.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
