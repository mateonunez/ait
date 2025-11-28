/**
 * Connector Card Design System
 *
 * Brand colors and styling utilities for connector cards.
 * Each service has its own accent color for consistent branding.
 */

export const SERVICE_COLORS = {
  // GitHub - Dark slate with electric blue accent
  github: {
    primary: "from-slate-600 to-slate-800",
    accent: "text-blue-500 dark:text-blue-400",
    glow: "shadow-blue-500/20 dark:shadow-blue-400/20",
    hover: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
    ring: "group-hover:ring-blue-500/30 dark:group-hover:ring-blue-400/30",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    button: "bg-slate-800 hover:bg-slate-700",
  },

  // Spotify - Signature green
  spotify: {
    primary: "from-green-500 to-green-700",
    accent: "text-green-500 dark:text-green-400",
    glow: "shadow-green-500/20 dark:shadow-green-400/20",
    hover: "group-hover:text-green-600 dark:group-hover:text-green-400",
    ring: "group-hover:ring-green-500/30 dark:group-hover:ring-green-400/30",
    badge: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    button: "bg-green-600 hover:bg-green-500",
  },

  // X/Twitter - Classic X black with blue accent
  x: {
    primary: "from-neutral-800 to-black",
    accent: "text-sky-500 dark:text-sky-400",
    glow: "shadow-sky-500/20 dark:shadow-sky-400/20",
    hover: "group-hover:text-sky-600 dark:group-hover:text-sky-400",
    ring: "group-hover:ring-sky-500/30 dark:group-hover:ring-sky-400/30",
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    button: "bg-black hover:bg-neutral-800",
  },

  // Slack - Aubergine purple
  slack: {
    primary: "from-purple-600 to-purple-800",
    accent: "text-purple-500 dark:text-purple-400",
    glow: "shadow-purple-500/20 dark:shadow-purple-400/20",
    hover: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
    ring: "group-hover:ring-purple-500/30 dark:group-hover:ring-purple-400/30",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    button: "bg-purple-700 hover:bg-purple-600",
  },

  // Linear - Indigo/Violet
  linear: {
    primary: "from-indigo-500 to-violet-600",
    accent: "text-indigo-500 dark:text-indigo-400",
    glow: "shadow-indigo-500/20 dark:shadow-indigo-400/20",
    hover: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
    ring: "group-hover:ring-indigo-500/30 dark:group-hover:ring-indigo-400/30",
    badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    button: "bg-indigo-600 hover:bg-indigo-500",
  },

  // Notion - Black/White minimalist
  notion: {
    primary: "from-neutral-700 to-neutral-900",
    accent: "text-neutral-700 dark:text-neutral-300",
    glow: "shadow-neutral-500/20 dark:shadow-neutral-400/20",
    hover: "group-hover:text-neutral-900 dark:group-hover:text-neutral-100",
    ring: "group-hover:ring-neutral-500/30 dark:group-hover:ring-neutral-400/30",
    badge: "bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border-neutral-500/20",
    button: "bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900",
  },

  // Google Calendar - Vibrant blue
  google: {
    primary: "from-blue-500 to-blue-700",
    accent: "text-blue-600 dark:text-blue-400",
    glow: "shadow-blue-500/20 dark:shadow-blue-400/20",
    hover: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
    ring: "group-hover:ring-blue-500/30 dark:group-hover:ring-blue-400/30",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    button: "bg-blue-600 hover:bg-blue-500",
  },

  // YouTube - Signature red
  youtube: {
    primary: "from-red-500 to-red-700",
    accent: "text-red-600 dark:text-red-500",
    glow: "shadow-red-500/20 dark:shadow-red-400/20",
    hover: "group-hover:text-red-600 dark:group-hover:text-red-400",
    ring: "group-hover:ring-red-500/30 dark:group-hover:ring-red-400/30",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    button: "bg-red-600 hover:bg-red-500",
  },
} as const;

export type ServiceType = keyof typeof SERVICE_COLORS;

/**
 * Base card styles shared across all connector cards
 */
export const CARD_BASE_STYLES = {
  container: [
    "group relative overflow-hidden cursor-pointer",
    "bg-card text-card-foreground",
    "rounded-xl border border-border/50",
    "transition-all duration-300 ease-out",
    "hover:shadow-xl hover:-translate-y-1",
    "hover:border-border",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "flex flex-col",
  ].join(" "),

  content: "p-3 sm:p-4 space-y-2 sm:space-y-3",

  header: "flex items-start gap-2 sm:gap-3",

  title: ["font-semibold text-sm sm:text-base leading-tight line-clamp-2", "transition-colors duration-200"].join(" "),

  subtitle: "text-xs text-muted-foreground mt-1",

  description: "text-xs sm:text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed",

  stats: "flex items-center gap-2 sm:gap-3 text-xs flex-wrap",

  statItem: "flex items-center gap-1 sm:gap-1.5 text-muted-foreground",

  footer: "flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2",

  footerBadges: "flex items-center gap-1.5 sm:gap-2 flex-wrap",

  timestamp: "text-xs text-muted-foreground whitespace-nowrap",

  externalLink: [
    "h-4 w-4 text-muted-foreground",
    "opacity-0 group-hover:opacity-100",
    "transition-all duration-200",
    "shrink-0 hover:text-foreground",
    "focus:outline-none focus-visible:opacity-100",
    "hover:scale-110",
  ].join(" "),

  avatar: ["ring-2 ring-border/50 transition-all duration-200"].join(" "),

  mediaOverlay: [
    "absolute inset-0",
    "bg-gradient-to-t from-black/70 via-black/20 to-transparent",
    "opacity-0 group-hover:opacity-100",
    "transition-opacity duration-300",
  ].join(" "),

  playButton: [
    "h-12 w-12 sm:h-14 sm:w-14",
    "rounded-full flex items-center justify-center",
    "shadow-lg backdrop-blur-sm",
    "hover:scale-110 active:scale-95",
    "transition-transform duration-200",
  ].join(" "),
};

/**
 * Animation variants for framer-motion
 */
export const CARD_ANIMATIONS = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
  hover: { y: -4, transition: { duration: 0.2 } },
  tap: { scale: 0.98 },
};

/**
 * Stagger animation for card lists
 */
export const STAGGER_ANIMATION = {
  container: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
  item: CARD_ANIMATIONS,
};

/**
 * Get glow effect class based on service
 */
export function getServiceGlow(service: ServiceType, intensity: "sm" | "md" | "lg" = "md"): string {
  const glowSize = {
    sm: "hover:shadow-lg",
    md: "hover:shadow-xl",
    lg: "hover:shadow-2xl",
  };
  return `${glowSize[intensity]} ${SERVICE_COLORS[service].glow}`;
}

/**
 * Utility to get gradient background for media cards
 */
export function getServiceGradient(service: ServiceType): string {
  return `bg-gradient-to-br ${SERVICE_COLORS[service].primary}`;
}
