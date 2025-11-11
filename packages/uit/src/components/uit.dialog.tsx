import type { HTMLAttributes } from "react";
import { cn } from "@/styles/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FlexGrid } from "@/components/ui/flex-grid";
import { Badge } from "@/components/ui/badge";
import { useUIt } from "@/contexts/uit.context";
import { ArrowLeft as BackIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AIT_SERVICES } from "@/utils/items.const";
import { FlexItem } from "./ui/flex-item";

type AItDialogProps = Omit<HTMLAttributes<HTMLDivElement>, "open" | "onOpenChange">;

const animationVariants = {
  expand: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { type: "spring", stiffness: 120, damping: 20, duration: 0.3 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },
};

const ExpandedView = ({
  item,
  onClose,
}: {
  item: (typeof AIT_SERVICES)[number];
  onClose: () => void;
}) => (
  <motion.div
    // {...animationVariants.expand}
    className="absolute inset-0 flex flex-col overflow-hidden rounded-md"
    style={{ backgroundColor: item.color }}
  >
    <div className="absolute inset-0 bg-black/20" />
    <div className="relative flex p-4">
      <button
        type="button"
        onClick={onClose}
        className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close expanded view"
      >
        <BackIcon className="h-6 w-6 text-white" />
      </button>
    </div>

    <DialogHeader className="relative px-6 pt-0 pb-6">
      <DialogTitle className="text-2xl font-bold text-white">{item.title}</DialogTitle>
    </DialogHeader>

    <div className="relative flex-1 overflow-y-auto px-6 pb-6">
      <p className="text-lg text-white/90 leading-relaxed">{item.description}</p>
    </div>
  </motion.div>
);

const ServicesGrid = ({
  items,
  onItemSelect,
}: {
  items: typeof AIT_SERVICES;
  onItemSelect: (id: string) => void;
}) => (
  <motion.div {...animationVariants.fade} className="h-full flex flex-col overflow-hidden rounded-md">
    <DialogHeader className="p-6">
      <DialogTitle className="text-2xl font-bold">Pick one (or more)</DialogTitle>
    </DialogHeader>

    <div className="relative flex-1 overflow-y-auto custom-scrollbar">
      <FlexGrid gap={12} className="p-4">
        {items.map((item) => (
          <FlexItem
            key={item.id}
            color={item.color}
            size={item.size}
            className={cn(
              "relative transition-transform hover:scale-[1.02]",
              item.disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-accent/5",
            )}
            onClick={() => !item.disabled && onItemSelect(item.id)}
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
);

export default function AItDialog({ className, ...props }: AItDialogProps) {
  const { isOpen, closeDialog, expandedItem, expandItem, collapseItem } = useUIt();

  const currentItem = AIT_SERVICES.find((item) => item.id === expandedItem);

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      closeDialog();
      collapseItem();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent
        className={cn(
          "!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0",
          "h-[100dvh] max-h-[100dvh] w-screen !max-w-none p-0",
          "!rounded-none !border-0 shadow-xl",
          className,
        )}
        {...props}
      >
        <AnimatePresence mode="wait">
          {currentItem ? (
            <ExpandedView key={currentItem.id} item={currentItem} onClose={collapseItem} />
          ) : (
            <ServicesGrid key="services-grid" items={AIT_SERVICES} onItemSelect={expandItem} />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
