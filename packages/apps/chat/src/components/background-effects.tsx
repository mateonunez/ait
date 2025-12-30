import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface FloatingOrbProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  color?: "violet" | "amber" | "mixed";
  delay?: number;
}

const sizeClasses = {
  sm: "w-32 h-32",
  md: "w-48 h-48",
  lg: "w-64 h-64",
  xl: "w-96 h-96",
};

const colorClasses = {
  violet: "bg-gradient-to-br from-violet-400/30 to-violet-600/20",
  amber: "bg-gradient-to-br from-amber-400/30 to-amber-600/20",
  mixed: "bg-gradient-to-br from-violet-400/25 via-amber-500/20 to-violet-600/15",
};

export function FloatingOrb({ className, size = "md", color = "mixed", delay = 0 }: FloatingOrbProps) {
  return (
    <motion.div
      className={cn(
        "absolute rounded-full blur-3xl will-change-[transform]",
        sizeClasses[size],
        colorClasses[color],
        className,
      )}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, -10, 0],
        scale: [1, 1.05, 0.95, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 8 + Math.random() * 4,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
        ease: "linear",
        delay,
      }}
    />
  );
}

export function BackgroundEffects() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent" />

      <FloatingOrb size="xl" color="violet" className="top-[-10%] left-[-10%]" delay={0} />
      <FloatingOrb size="lg" color="amber" className="top-[20%] right-[-5%]" delay={1.5} />
      <FloatingOrb size="md" color="mixed" className="bottom-[30%] left-[10%]" delay={3} />
      <FloatingOrb size="lg" color="violet" className="bottom-[-10%] right-[20%]" delay={2} />
      <FloatingOrb size="sm" color="amber" className="top-[50%] left-[40%]" delay={4} />

      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
