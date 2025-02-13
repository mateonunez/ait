import type { HTMLAttributes } from "react";
import { cn } from "@/styles/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FlexGrid } from "@/components/ui/flex-grid";
import { FlexItem } from "@/components/ui/flex-item";
import { useUIt } from "@/contexts/uit.context";

type AItDialogProps = Omit<HTMLAttributes<HTMLDivElement>, "open" | "onOpenChange">;

const ITEMS = [
  {
    id: "github",
    title: "GitHub",
    description: "Recent activity and repositories",
    color: "#1A1E22", // GitHub dark
    size: "lg",
  },
  {
    id: "spotify",
    title: "Spotify",
    description: "Now playing",
    color: "#1DB954", // Spotify green
    size: "xs",
  },
  {
    id: "x-twitter",
    title: "X (Twitter)",
    description: "Latest tweets",
    color: "#14171A", // X dark
    size: "md",
  },
  {
    id: "discord",
    title: "Discord",
    description: "Server activity",
    color: "#5865F2", // Discord blue
    size: "xs",
  },
  {
    id: "youtube",
    title: "YouTube",
    description: "Latest videos and analytics",
    color: "#FF0000", // YouTube red
    size: "full",
  },
  {
    id: "notion",
    title: "Notion",
    description: "Recent documents and updates",
    color: "#000000", // Notion black
    size: "xl",
  },
  {
    id: "slack",
    title: "Slack",
    description: "Channel updates",
    color: "#4A154B", // Slack purple
    size: "xs",
  },
  {
    id: "linear",
    title: "Linear",
    description: "Assigned issues",
    color: "#5E6AD2", // Linear blue
    size: "xs",
  },
  {
    id: "vercel",
    title: "Vercel",
    description: "Deployment status",
    color: "#000000", // Vercel black
    size: "full",
  },
  {
    id: "figma",
    title: "Figma",
    description: "Recent files",
    color: "#1E1E1E", // Figma dark
    size: "xs",
  },
  {
    id: "aws",
    title: "AWS",
    description: "Service status and metrics",
    color: "#FF9900", // AWS orange
    size: "lg",
  },
  {
    id: "stripe",
    title: "Stripe",
    description: "Payment analytics",
    color: "#635BFF", // Stripe purple
    size: "xs",
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

        <div className={cn("relative flex-1 overflow-y-auto")}>
          <FlexGrid gap={4} className="p-4">
            {ITEMS.map((item) => (
              <FlexItem key={item.id} color={item.color} size={item.size}>
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
