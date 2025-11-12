import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/styles/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { AIChatButton } from "@/components/ai-chat-button";
import { FlexGrid } from "@/components/ui/flex-grid";
import { FlexItem } from "@/components/ui/flex-item";
import { Badge } from "@/components/ui/badge";
import { AIT_SERVICES } from "@/utils/items.const";

const animationVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },
};

export default function HomePage() {
  const [, setLocation] = useLocation();

  const handleItemSelect = (id: string) => {
    const item = AIT_SERVICES.find((service) => service.id === id);
    if (item?.route) {
      setLocation(item.route);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold">AIt</h1>
          <p className="text-sm text-muted-foreground">Your AI-powered integration hub</p>
        </div>
        <div className="flex items-center gap-2">
          <AIChatButton />
          <ThemeToggle />
        </div>
      </div>

      {/* Services Grid */}
      <motion.div {...animationVariants.fade} className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-2">Pick one (or more)</h2>
          <p className="text-sm text-muted-foreground mb-6">Connect to your favorite services and view your data</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
          <FlexGrid gap={12}>
            {AIT_SERVICES.map((item) => (
              <FlexItem
                key={item.id}
                color={item.color}
                size={item.size}
                className={cn(
                  "relative transition-transform hover:scale-[1.02]",
                  item.disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-accent/5",
                )}
                onClick={() => !item.disabled && handleItemSelect(item.id)}
                aria-disabled={item.disabled}
              >
                {item.disabled && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center pointer-events-none">
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                )}

                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center p-4">
                  <span className="text-xl font-bold text-white">{item.title}</span>
                  <span className="text-sm text-muted-foreground line-clamp-3">{item.description}</span>
                </div>
              </FlexItem>
            ))}
          </FlexGrid>
        </div>
      </motion.div>
    </div>
  );
}
