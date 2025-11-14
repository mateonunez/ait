import {
  Heart,
  Repeat2,
  MessageCircle,
  Quote,
  ExternalLink,
  User,
  Image as ImageIcon,
  Video,
  BarChart3,
  MapPin,
  MessageSquare,
  Play,
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Progress } from "../ui/progress";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { XTweetEntity as XTweet, XMediaEntity, XPollEntity } from "@ait/core";

interface TweetCardProps {
  tweet: XTweet;
  onClick?: () => void;
  className?: string;
}

export function TweetCard({ tweet, onClick, className }: TweetCardProps) {
  const tweetUrl = tweet.authorUsername ? `https://twitter.com/${tweet.authorUsername}/status/${tweet.id}` : undefined;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (tweetUrl) {
      window.open(tweetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tweetUrl) {
      window.open(tweetUrl, "_blank", "noopener,noreferrer");
    }
  };

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

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 border-border/50 hover:border-border",
        className,
      )}
      onClick={handleClick}
    >
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Header with Author Avatar */}
        <div className="flex items-start gap-2 sm:gap-3">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-border/50 group-hover:ring-blue-500/20 transition-all flex-shrink-0">
            <AvatarImage
              src={`https://unavatar.io/twitter/${tweet.authorUsername}`}
              alt={tweet.authorName || tweet.authorUsername || "User"}
            />
            <AvatarFallback className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {tweet.authorName || tweet.authorUsername || "Unknown"}
                </h3>
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
              <button
                type="button"
                onClick={handleExternalLinkClick}
                className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:text-foreground focus:outline-none"
                aria-label="Open tweet in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tweet Content */}
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed line-clamp-4 transition-colors">
          {tweet.text}
        </p>

        {/* Media Attachments */}
        {hasMedia && (
          <div
            className={cn(
              "grid gap-2 rounded-lg overflow-hidden",
              mediaCount === 1 && "grid-cols-1",
              mediaCount === 2 && "grid-cols-2",
              mediaCount >= 3 && "grid-cols-2",
            )}
          >
            {tweet.mediaAttachments?.slice(0, 4).map((media, idx) => (
              <div
                key={media.media_key}
                className={cn(
                  "relative aspect-video rounded-md overflow-hidden bg-muted border border-border/50",
                  "flex items-center justify-center group/media",
                  mediaCount === 3 && idx === 0 && "col-span-2",
                )}
              >
                {media.url || media.preview_image_url ? (
                  <>
                    <img
                      src={media.preview_image_url || media.url}
                      alt={media.alt_text || "Media"}
                      className="w-full h-full object-cover transition-transform group-hover/media:scale-105"
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
              </div>
            ))}
            {mediaCount > 4 && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-md">
                +{mediaCount - 4} more
              </div>
            )}
          </div>
        )}

        {/* Poll Display */}
        {hasPoll && poll && (
          <div className="space-y-2 p-2 sm:p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground mb-1.5 sm:mb-2">
              <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="font-medium">
                {totalVotes.toLocaleString()} vote{totalVotes !== 1 ? "s" : ""}
              </span>
              <span>•</span>
              <span className="capitalize">{poll.voting_status}</span>
            </div>
            {poll.options?.slice(0, 4).map((option) => {
              const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
              return (
                <div key={option.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground line-clamp-1">{option.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {percentage.toFixed(1)}% ({option.votes.toLocaleString()})
                    </span>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
              );
            })}
          </div>
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
          <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
            {tweet.likeCount != null && tweet.likeCount > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="font-medium tabular-nums">{tweet.likeCount.toLocaleString()}</span>
              </div>
            )}
            {tweet.retweetCount != null && tweet.retweetCount > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors">
                <Repeat2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="font-medium tabular-nums">{tweet.retweetCount.toLocaleString()}</span>
              </div>
            )}
            {tweet.replyCount != null && tweet.replyCount > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="font-medium tabular-nums">{tweet.replyCount.toLocaleString()}</span>
              </div>
            )}
            {tweet.quoteCount != null && tweet.quoteCount > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground transition-colors">
                <Quote className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="font-medium tabular-nums">{tweet.quoteCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {tweet.lang && (
              <Badge variant="outline" className="text-xs font-normal uppercase">
                {tweet.lang}
              </Badge>
            )}
            {isThread && (
              <Badge
                variant="secondary"
                className="text-xs font-normal bg-blue-500/10 text-blue-600 dark:text-blue-400"
              >
                Thread
              </Badge>
            )}
          </div>
          {tweet.createdAt && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(tweet.createdAt)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
