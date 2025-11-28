import { type ReactNode, forwardRef, type KeyboardEvent } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { cn } from "@/styles/utils";
import {
  CARD_BASE_STYLES,
  CARD_ANIMATIONS,
  SERVICE_COLORS,
  getServiceGlow,
  type ServiceType,
} from "./connector-card.styles";

interface ConnectorCardBaseProps extends Omit<HTMLMotionProps<"article">, "children"> {
  /** Service type for brand styling */
  service: ServiceType;
  /** Card content */
  children: ReactNode;
  /** Optional click handler */
  onClick?: () => void;
  /** External URL to open */
  externalUrl?: string;
  /** Additional className */
  className?: string;
  /** Disable animations */
  disableAnimations?: boolean;
  /** Whether to show the external link button */
  showExternalLink?: boolean;
}

/**
 * Base card component for all connector cards.
 * Provides consistent styling, animations, and interactions.
 */
export const ConnectorCardBase = forwardRef<HTMLElement, ConnectorCardBaseProps>(
  (
    {
      service,
      children,
      onClick,
      externalUrl,
      className,
      disableAnimations = false,
      showExternalLink = true,
      ...motionProps
    },
    ref,
  ) => {
    const handleClick = () => {
      if (onClick) {
        onClick();
      } else if (externalUrl) {
        window.open(externalUrl, "_blank", "noopener,noreferrer");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    };

    const handleExternalLinkClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (externalUrl) {
        window.open(externalUrl, "_blank", "noopener,noreferrer");
      }
    };

    const animationProps = disableAnimations
      ? {}
      : {
          initial: CARD_ANIMATIONS.initial,
          animate: CARD_ANIMATIONS.animate,
          exit: CARD_ANIMATIONS.exit,
          whileHover: CARD_ANIMATIONS.hover,
          whileTap: CARD_ANIMATIONS.tap,
        };

    return (
      <motion.article
        ref={ref as React.Ref<HTMLElement>}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(CARD_BASE_STYLES.container, getServiceGlow(service), className)}
        {...animationProps}
        {...motionProps}
      >
        {children}

        {/* External link button - floated to top-right */}
        {showExternalLink && externalUrl && (
          <button
            type="button"
            onClick={handleExternalLinkClick}
            className={cn("absolute top-3 right-3 sm:top-4 sm:right-4 z-10", CARD_BASE_STYLES.externalLink)}
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </motion.article>
    );
  },
);

ConnectorCardBase.displayName = "ConnectorCardBase";

/**
 * Card Header component
 */
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ConnectorCardHeader({ children, className }: CardHeaderProps) {
  return <div className={cn(CARD_BASE_STYLES.header, className)}>{children}</div>;
}

/**
 * Card Title component with service-specific hover color
 */
interface CardTitleProps {
  children: ReactNode;
  service: ServiceType;
  className?: string;
}

export function ConnectorCardTitle({ children, service, className }: CardTitleProps) {
  const serviceColors = SERVICE_COLORS[service];
  return <h3 className={cn(CARD_BASE_STYLES.title, serviceColors.hover, className)}>{children}</h3>;
}

/**
 * Card Content wrapper
 */
interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function ConnectorCardContent({ children, className }: CardContentProps) {
  return <div className={cn(CARD_BASE_STYLES.content, className)}>{children}</div>;
}

/**
 * Card Description
 */
interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function ConnectorCardDescription({ children, className }: CardDescriptionProps) {
  return <p className={cn(CARD_BASE_STYLES.description, className)}>{children}</p>;
}

/**
 * Card Stats row
 */
interface CardStatsProps {
  children: ReactNode;
  className?: string;
}

export function ConnectorCardStats({ children, className }: CardStatsProps) {
  return <div className={cn(CARD_BASE_STYLES.stats, className)}>{children}</div>;
}

/**
 * Individual stat item
 */
interface CardStatItemProps {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ConnectorCardStatItem({ icon, children, className }: CardStatItemProps) {
  return (
    <div className={cn(CARD_BASE_STYLES.statItem, className)}>
      {icon}
      <span className="font-medium tabular-nums">{children}</span>
    </div>
  );
}

/**
 * Card Footer
 */
interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function ConnectorCardFooter({ children, className }: CardFooterProps) {
  return <div className={cn(CARD_BASE_STYLES.footer, className)}>{children}</div>;
}

/**
 * Footer badges container
 */
interface CardFooterBadgesProps {
  children: ReactNode;
  className?: string;
}

export function ConnectorCardFooterBadges({ children, className }: CardFooterBadgesProps) {
  return <div className={cn(CARD_BASE_STYLES.footerBadges, className)}>{children}</div>;
}

/**
 * Timestamp display
 */
interface CardTimestampProps {
  children: ReactNode;
  className?: string;
}

export function ConnectorCardTimestamp({ children, className }: CardTimestampProps) {
  return <span className={cn(CARD_BASE_STYLES.timestamp, className)}>{children}</span>;
}

/**
 * Media container for cards with images/artwork
 */
interface CardMediaProps {
  children: ReactNode;
  service: ServiceType;
  className?: string;
  aspectRatio?: "square" | "video" | "wide";
}

export function ConnectorCardMedia({ children, service, className, aspectRatio = "square" }: CardMediaProps) {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[16/9]",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        `bg-linear-to-br ${SERVICE_COLORS[service].primary}/10`,
        aspectClasses[aspectRatio],
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Play button overlay for media cards
 */
interface CardPlayButtonProps {
  service: ServiceType;
  className?: string;
}

export function ConnectorCardPlayButton({ service, className }: CardPlayButtonProps) {
  const serviceColors = SERVICE_COLORS[service];

  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div className={cn(CARD_BASE_STYLES.playButton, `bg-linear-to-br ${serviceColors.primary}`, className)}>
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 text-white ml-0.5"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Gradient overlay for media
 */
export function ConnectorCardMediaOverlay() {
  return <div className={CARD_BASE_STYLES.mediaOverlay} />;
}
