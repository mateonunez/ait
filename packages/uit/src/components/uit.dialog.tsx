import type { HTMLAttributes } from "react";
import { cn } from "@/styles/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FlexGrid } from "@/components/ui/flex-grid"; // our updated grid
import { FlexItem } from "@/components/ui/flex-item"; // our updated item
import { Badge } from "@/components/ui/badge";
import { useUIt } from "@/contexts/uit.context";

type AItDialogProps = Omit<HTMLAttributes<HTMLDivElement>, "open" | "onOpenChange">;

const ITEMS = [
  {
    id: "github",
    title: "GitHub",
    description: "Recent activity and repositories",
    color: "#1A1E22",
    size: "lg",
    disabled: false,
  },
  {
    id: "spotify",
    title: "Spotify",
    description: "Now playing",
    color: "#1DB954",
    size: "lg",
    disabled: false,
  },
  {
    id: "x-twitter",
    title: "X (Twitter)",
    description: "Latest tweets",
    color: "#14171A",
    size: "md",
    disabled: false,
  },
  {
    id: "discord",
    title: "Discord",
    description: "Server activity",
    color: "#5865F2",
    size: "sm",
    disabled: true,
  },
  {
    id: "youtube",
    title: "YouTube",
    description: "Latest videos and analytics",
    color: "#FF0000",
    size: "full",
    disabled: true,
  },
  {
    id: "notion",
    title: "Notion",
    description: "Recent documents and updates",
    color: "#000000",
    size: "full",
    disabled: true,
  },
  {
    id: "slack",
    title: "Slack",
    description: "Channel updates",
    color: "#4A154B",
    size: "sm",
    disabled: true,
  },
  {
    id: "linear",
    title: "Linear",
    description: "Assigned issues",
    color: "#5E6AD2",
    size: "xs",
    disabled: true,
  },
  {
    id: "vercel",
    title: "Vercel",
    description: "Deployment status",
    color: "#000000",
    size: "xs",
    disabled: true,
  },
  {
    id: "figma",
    title: "Figma",
    description: "Recent files",
    color: "#1E1E1E",
    size: "xs",
    disabled: true,
  },
  {
    id: "aws",
    title: "AWS",
    description: "Service status and metrics",
    color: "#FF9900",
    size: "full",
    disabled: true,
  },
  {
    id: "stripe",
    title: "Stripe",
    description: "Payment analytics",
    color: "#635BFF",
    size: "xs",
    disabled: true,
  },
] as const;

export default function AItDialog({ className, ...props }: Readonly<AItDialogProps>) {
  const { isOpen, closeDialog } = useUIt();

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent
        className={cn(
          "h-[100dvh] max-h-[100dvh] w-screen max-w-screen p-6",
          "bg-neutral-900",
          "sm:h-[90dvh] sm:max-h-[90dvh] sm:w-[90vw] sm:max-w-[90vw] sm:rounded-xl",
          className,
        )}
        {...props}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white/90">Pick one (or more)</DialogTitle>
        </DialogHeader>

        <div className="relative flex-1 overflow-y-auto">
          <FlexGrid gap={12} className="p-4">
            {ITEMS.map((item) => (
              <FlexItem
                key={item.id}
                color={item.color}
                size={item.size}
                className={cn(
                  "relative transition-colors",
                  item.disabled ? "opacity-60 hover:bg-background" : "hover:bg-accent/5",
                )}
                onClick={(e) => item.disabled && e.preventDefault()}
                aria-disabled={item.disabled}
              >
                {item.disabled && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                    <Badge className="pointer-events-none">Coming Soon</Badge>
                  </div>
                )}
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
                  <span className="text-xl font-bold text-white/90">{item.title}</span>
                  <span className="text-sm text-white/70">{item.description}</span>
                </div>
              </FlexItem>
            ))}
          </FlexGrid>
        </div>
      </DialogContent>
    </Dialog>
  );
}
