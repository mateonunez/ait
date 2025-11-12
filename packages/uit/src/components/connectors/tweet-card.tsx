import { Heart, Repeat2, MessageCircle, Quote, ExternalLink } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { XTweetEntity as XTweet } from "@ait/core";

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

  const totalEngagement =
    (tweet.likeCount ?? 0) + (tweet.retweetCount ?? 0) + (tweet.replyCount ?? 0) + (tweet.quoteCount ?? 0);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 border-border/50 hover:border-border",
        className,
      )}
      onClick={handleClick}
    >
      <div className="p-5 space-y-4">
        {/* Header with Author */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {tweet.authorName || tweet.authorUsername || "Unknown"}
            </h3>
            {tweet.authorUsername && <p className="text-xs text-muted-foreground mt-0.5">@{tweet.authorUsername}</p>}
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>

        {/* Tweet Content */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6 transition-colors">{tweet.text}</p>

        {/* Engagement Stats */}
        {totalEngagement > 0 && (
          <div className="flex items-center gap-4 text-sm">
            {tweet.likeCount != null && tweet.likeCount > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                <Heart className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{tweet.likeCount.toLocaleString()}</span>
              </div>
            )}
            {tweet.retweetCount != null && tweet.retweetCount > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors">
                <Repeat2 className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{tweet.retweetCount.toLocaleString()}</span>
              </div>
            )}
            {tweet.replyCount != null && tweet.replyCount > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{tweet.replyCount.toLocaleString()}</span>
              </div>
            )}
            {tweet.quoteCount != null && tweet.quoteCount > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground transition-colors">
                <Quote className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{tweet.quoteCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          {tweet.lang && (
            <Badge variant="outline" className="text-xs font-normal uppercase">
              {tweet.lang}
            </Badge>
          )}
          {tweet.createdAt && (
            <span className="text-xs text-muted-foreground">{formatRelativeTime(tweet.createdAt)}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
