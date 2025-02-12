export const GRADIENTS = {
  light: "from-slate-300 via-zinc-300 to-rose-200",
  dark: "dark:from-slate-500 dark:via-zinc-400 dark:to-rose-400",
} as const;

export const ANIMATIONS = {
  base: "transition-all duration-300 ease-out",
  gradient: "animate-gradient-flow hover:animate-gradient-hover",
  scale: "hover:scale-105 active:scale-95",
} as const;

export const LAYOUT = {
  container: "min-h-dvh bg-primary",
  content: "relative flex items-center justify-center",
} as const;
