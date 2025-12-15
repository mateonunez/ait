import { cn } from "@/styles/utils";
import { formatRelativeTime } from "@/utils/date.utils";
import type { XMediaEntity, XPollEntity, XTweetEntity as XTweet } from "@ait/core";
import { motion } from "framer-motion";
import {
  BarChart3,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  Play,
  Quote,
  Repeat2,
  User,
  Video,
} from "lucide-react";
import { getEntityDate } from "../../utils/entity-date.utils";
import { DEFAULT_MAX_CHARS, truncateText } from "../../utils/text.utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
  ConnectorCardHeader,
  ConnectorCardStats,
  ConnectorCardTimestamp,
  ConnectorCardTitle,
} from "./connector-card-base";

interface TweetCardProps {
  tweet: XTweet;
  onClick?: () => void;
  className?: string;
}

export function TweetCard({ tweet, onClick, className }: TweetCardProps) {
  const tweetUrl = tweet.authorUsername ? `https://twitter.com/${tweet.authorUsername}/status/${tweet.id}` : undefined;

  const totalEngagement =
    (tweet.likeCount ?? 0) + (tweet.retweetCount ?? 0) + (tweet.replyCount ?? 0) + (tweet.quoteCount ?? 0);

  const isReply = tweet.inReplyToUserId !== null && tweet.inReplyToUserId !== undefined;
  const isThread = tweet.conversationId !== null && tweet.conversationId !== undefined;

  // Media helpers
  const hasMedia = tweet.mediaAttachments && tweet.mediaAttachments.length > 0;
  const mediaCount = tweet.mediaAttachments?.length ?? 0;

  const getMediaIcon = (media: XMediaEntity) => {
    if (media.type === "video") return <Video className="h-4 w-4" />;
    if (media.type === "animated_gif") return <Play className="h-4 w-4" />;
    return <ImageIcon className="h-4 w-4" />;
  };

  // Poll helpers
  const hasPoll = tweet.pollData !== null && tweet.pollData !== undefined;
  const poll = tweet.pollData as XPollEntity | null;
  const totalVotes = poll?.options?.reduce((sum, opt) => sum + (opt.votes || 0), 0) ?? 0;

  // Location helper
  const hasLocation = tweet.placeData !== null && tweet.placeData !== undefined;
  const location = tweet.placeData as any;

  // Date helper
  const date = getEntityDate(tweet);

  return (
    <ConnectorCardBase service="x" onClick={onClick} externalUrl={tweetUrl} className={className}>
      <ConnectorCardContent>
        {/* Header with Author Avatar */}
        <ConnectorCardHeader>
          <Avatar className="h-9 w-9 sm:h-11 sm:w-11 ring-2 ring-border/50 group-hover:ring-sky-500/40 transition-all duration-300 shrink-0">
            <AvatarImage
              src={`https://unavatar.io/twitter/${tweet.authorUsername}`}
              alt={tweet.authorName || tweet.authorUsername || "User"}
            />
            <AvatarFallback className="bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <ConnectorCardTitle service="x" className="line-clamp-1">
                  {tweet.authorName || tweet.authorUsername || "Unknown"}
                </ConnectorCardTitle>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                  {tweet.authorUsername && (
                    <span className="text-xs text-muted-foreground">@{tweet.authorUsername}</span>
                  )}
                  {isReply && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>Reply</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ConnectorCardHeader>

        {/* Tweet Content */}
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed line-clamp-4 transition-colors whitespace-pre-wrap break-words">
          {truncateText(tweet.text, DEFAULT_MAX_CHARS)}
        </p>

        {/* Media Attachments */}
        {hasMedia && (
          <motion.div
            className={cn(
              "grid gap-2 rounded-lg overflow-hidden",
              mediaCount === 1 && "grid-cols-1",
              mediaCount === 2 && "grid-cols-2",
              mediaCount >= 3 && "grid-cols-2",
            )}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            {tweet.mediaAttachments?.slice(0, 4).map((media, idx) => (
              <motion.div
                key={media.media_key}
                className={cn(
                  "relative aspect-video rounded-md overflow-hidden bg-muted border border-border/50",
                  "flex items-center justify-center group/media",
                  mediaCount === 3 && idx === 0 && "col-span-2",
                )}
                whileHover={{ scale: 1.02 }}
              >
                {media.url || media.preview_image_url ? (
                  <>
                    <img
                      src={media.preview_image_url || media.url}
                      alt={media.alt_text || "Media"}
                      className="w-full h-full object-cover transition-transform group-hover/media:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-white text-xs font-medium opacity-0 group-hover/media:opacity-100 transition-opacity">
                      {getMediaIcon(media)}
                      <span className="capitalize">{media.type}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {getMediaIcon(media)}
                    <span className="text-xs capitalize">{media.type}</span>
                  </div>
                )}
              </motion.div>
            ))}
            {mediaCount > 4 && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-md">
                +{mediaCount - 4} more
              </div>
            )}
          </motion.div>
        )}

        {/* Poll Display */}
        {hasPoll && poll && (
          <motion.div
            className="space-y-2 p-2 sm:p-3 rounded-lg bg-muted/50 border border-border/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground mb-1.5 sm:mb-2">
              <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="font-medium">
                {totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}
              </span>
              <span>•</span>
              <span className="capitalize">{poll.voting_status}</span>
            </div>
            {poll.options?.slice(0, 4).map((option, idx) => {
              const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
              return (
                <motion.div
                  key={option.label}
                  className="space-y-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + idx * 0.05 }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground line-clamp-1">{option.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {percentage.toFixed(1)}% ({option.votes.toLocaleString()})
                    </span>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Location Badge */}
        {hasLocation && (location.full_name || location.name) && (
          <div className="flex items-center gap-1 sm:gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{location.full_name || location.name}</span>
          </div>
        )}

        {/* Engagement Stats */}
        {totalEngagement > 0 && (
          <ConnectorCardStats>
            {tweet.likeCount != null && tweet.likeCount > 0 && (
              <motion.div
                className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Heart className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{tweet.likeCount.toLocaleString()}</span>
              </motion.div>
            )}
            {tweet.retweetCount != null && tweet.retweetCount > 0 && (
              <motion.div
                className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Repeat2 className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{tweet.retweetCount.toLocaleString()}</span>
              </motion.div>
            )}
            {tweet.replyCount != null && tweet.replyCount > 0 && (
              <motion.div
                className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{tweet.replyCount.toLocaleString()}</span>
              </motion.div>
            )}
            {tweet.quoteCount != null && tweet.quoteCount > 0 && (
              <motion.div
                className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Quote className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{tweet.quoteCount.toLocaleString()}</span>
              </motion.div>
            )}
          </ConnectorCardStats>
        )}

        {/* Footer */}
        <ConnectorCardFooter>
          <ConnectorCardFooterBadges>
            {tweet.lang && (
              <Badge variant="outline" className="text-xs font-medium uppercase">
                {tweet.lang}
              </Badge>
            )}
            {isThread && (
              <Badge variant="secondary" className="text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400">
                Thread
              </Badge>
            )}
          </ConnectorCardFooterBadges>
          {date && <ConnectorCardTimestamp>Posted {formatRelativeTime(date.toISOString())}</ConnectorCardTimestamp>}
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
