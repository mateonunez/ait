import { formatRelativeTime } from "@ait/core";
import { getEntityDate } from "@ait/core";
import type { GoogleYouTubeSubscriptionEntity } from "@ait/core";
import { motion } from "framer-motion";
import { Video, Youtube } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardDescription,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
  ConnectorCardHeader,
  ConnectorCardTimestamp,
  ConnectorCardTitle,
} from "./connector-card-base";

interface SubscriptionCardProps {
  subscription: GoogleYouTubeSubscriptionEntity;
  onClick?: () => void;
  className?: string;
}

export function GoogleYouTubeSubscriptionCard({ subscription, onClick, className }: SubscriptionCardProps) {
  const channelUrl = subscription.resourceChannelId
    ? `https://www.youtube.com/channel/${subscription.resourceChannelId}`
    : undefined;

  const date = getEntityDate(subscription);

  return (
    <ConnectorCardBase service="youtube" onClick={onClick} externalUrl={channelUrl} className={className}>
      <ConnectorCardContent>
        {/* Header with YouTube Icon */}
        <ConnectorCardHeader>
          <motion.div
            className="shrink-0 pt-0.5 text-red-600 dark:text-red-500"
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.div>
          <div className="flex-1 min-w-0 pr-6">
            <ConnectorCardTitle service="youtube" className="line-clamp-2">
              {subscription.title || "Untitled Channel"}
            </ConnectorCardTitle>
            {date && (
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Subscribed {formatRelativeTime(date.toISOString())}
              </p>
            )}
          </div>
        </ConnectorCardHeader>

        {/* Thumbnail and Description */}
        <div className="flex gap-3">
          {subscription.thumbnailUrl && (
            <motion.div
              className="shrink-0"
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <img
                src={subscription.thumbnailUrl}
                alt={subscription.title}
                className="w-12 h-12 rounded-full object-cover border-2 border-border/50 ring-2 ring-red-500/20 group-hover:ring-red-500/40 transition-all"
              />
            </motion.div>
          )}
          {getEntityDate(subscription) && (
            <ConnectorCardTimestamp className="ml-auto">
              Subscribed {formatRelativeTime(getEntityDate(subscription)!)}
            </ConnectorCardTimestamp>
          )}
          {subscription.description && (
            <ConnectorCardDescription className="line-clamp-2 flex-1">
              {subscription.description}
            </ConnectorCardDescription>
          )}
        </div>

        {/* Footer */}
        <ConnectorCardFooter>
          <ConnectorCardFooterBadges>
            <Badge
              variant="outline"
              className="text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
            >
              <Video className="h-3 w-3 mr-1" />
              {subscription.totalItemCount} videos
            </Badge>
            {subscription.newItemCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Badge
                  variant="secondary"
                  className="text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  {subscription.newItemCount} new
                </Badge>
              </motion.div>
            )}
          </ConnectorCardFooterBadges>
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
