export const theme = {
  gradients: {
    light: "from-slate-500 via-zinc-500 to-rose-400",
    dark: "dark:from-slate-500 dark:via-zinc-400 dark:to-rose-400",
  },
  animations: {
    base: "transition-all duration-300 ease-out",
    gradient: "animate-gradient-flow hover:animate-gradient-hover",
    scale: "hover:scale-105 active:scale-95",
  },
  layout: {
    container: "min-h-dvh bg-primary",
    content: "relative flex items-center justify-center",
  },
  typography: {
    heading: {
      base: "font-bold tracking-tight cursor-default text-center",
      hero: "text-5xl sm:text-6xl md:text-8xl lg:text-9xl xl:text-[12rem]",
    },
    gradient: {
      base: "text-transparent bg-clip-text selection:bg-rose-200/20 dark:selection:bg-rose-400/20",
      animation: "bg-[length:200%_200%]",
    },
  },
} as const;

export type Theme = typeof theme;
