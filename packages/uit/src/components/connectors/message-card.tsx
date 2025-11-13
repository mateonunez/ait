import { Hash, MessageSquare, Reply, File, Image, Pin, FileText, Video, Music, Archive } from "lucide-react";
import { cn } from "@/styles/utils";
import type { SlackMessageEntity as SlackMessage, SlackFile, SlackReaction } from "@ait/core";

interface MessageCardProps {
  message: SlackMessage;
  onClick?: () => void;
  className?: string;
}

/**
 * Get initials from a name for avatar display
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get a consistent color for a user based on their name
 */
function getUserColor(name: string | null): string {
  if (!name) return "bg-gray-500";

  const colors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Format timestamp in Slack style (e.g., "2:45 PM" or "Yesterday")
 */
function formatSlackTime(date: Date | string): string {
  // Handle both Date objects and ISO strings
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Check if date is valid
  if (Number.isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    // Today - show time
    return dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 7) {
    return dateObj.toLocaleDateString("en-US", { weekday: "short" });
  }
  return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Check if channel is a Direct Message
 */
function isDirectMessage(channelId: string): boolean {
  return channelId.startsWith("D");
}

/**
 * Get file icon based on mimetype
 */
function getFileIcon(mimetype?: string) {
  if (!mimetype) return File;
  if (mimetype.startsWith("image/")) return Image;
  if (mimetype.startsWith("video/")) return Video;
  if (mimetype.startsWith("audio/")) return Music;
  if (mimetype.includes("pdf")) return FileText;
  if (mimetype.includes("zip") || mimetype.includes("compressed")) return Archive;
  return File;
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageCard({ message, onClick, className }: MessageCardProps) {
  const isThread = message.threadTs && message.threadTs !== message.ts;
  const userName = message.userName || "Unknown User";
  const initials = getInitials(userName);
  const userColor = getUserColor(userName);
  const isDM = isDirectMessage(message.channelId);
  const displayChannelName = isDM ? "Direct Message" : message.channelName;

  // Ensure files is an array
  const files = Array.isArray(message.files) ? message.files : [];

  // Helper to check if file is an image
  const isImageFile = (file: SlackFile) => file?.mimetype?.startsWith("image/");

  // Get best available thumbnail URL
  const getThumbnailUrl = (file: SlackFile) => {
    return file.thumb_360 || file.thumb_480 || file.thumb_160 || file.thumb_80 || file.thumb_64;
  };

  const handleClick = () => {
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      className={cn(
        "group relative px-5 py-3 transition-all duration-200 cursor-pointer w-full text-left",
        "hover:bg-muted/40 border-l-4 border-transparent hover:border-l-purple-500/60",
        "rounded-lg bg-card border border-border/30 hover:border-border/50",
        "hover:shadow-sm",
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="flex-shrink-0 pt-1">
          <div
            className={cn(
              "w-9 h-9 rounded-md flex items-center justify-center text-white text-sm font-semibold shadow-sm",
              userColor,
            )}
          >
            {initials}
          </div>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header: User name and timestamp */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-foreground text-sm hover:underline">{userName}</span>
            <span className="text-xs text-muted-foreground/70 font-normal">{formatSlackTime(message.createdAt)}</span>
            {message.edited && <span className="text-xs text-muted-foreground/50 italic">(edited)</span>}
            {message.pinnedTo && message.pinnedTo.length > 0 && (
              <div className="flex items-center gap-0.5 text-xs text-yellow-600 dark:text-yellow-500">
                <Pin className="h-3 w-3" />
              </div>
            )}
            {isThread && (
              <div className="flex items-center gap-1 text-xs text-purple-500 dark:text-purple-400">
                <Reply className="h-3 w-3" />
                <span className="font-medium">Thread</span>
              </div>
            )}
          </div>

          {/* Message Text */}
          {message.text && (
            <div className="text-sm text-foreground leading-relaxed break-words">
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, idx) => (
                <div
                  key={
                    attachment.id
                      ? `attachment-${attachment.id}`
                      : `attachment-${idx}-${attachment.title || attachment.fallback || idx}`
                  }
                  className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs hover:bg-muted/30 transition-colors"
                  style={attachment.color ? { borderLeftColor: attachment.color, borderLeftWidth: "4px" } : undefined}
                >
                  {attachment.title && (
                    <div className="font-semibold mb-1">
                      {attachment.title_link ? (
                        <a
                          href={attachment.title_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {attachment.title}
                        </a>
                      ) : (
                        attachment.title
                      )}
                    </div>
                  )}
                  {attachment.text && <div className="text-muted-foreground mb-1">{attachment.text}</div>}
                  {attachment.image_url && (
                    <img
                      src={attachment.image_url}
                      alt={attachment.fallback || "Attachment"}
                      className="max-w-full rounded mt-1"
                    />
                  )}
                  {attachment.fields && attachment.fields.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {attachment.fields.map((field, fieldIdx) => (
                        <div key={`field-${fieldIdx}-${field.title || field.value || fieldIdx}`}>
                          {field.title && <div className="font-semibold">{field.title}</div>}
                          {field.value && <div className="text-muted-foreground">{field.value}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Files - Images and Documents */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file: SlackFile) => {
                const isImage = isImageFile(file);
                const thumbnailUrl = getThumbnailUrl(file);
                console.log({ isImage, thumbnailUrl });
                const FileIcon = getFileIcon(file.mimetype);

                // Image files: render as gallery item
                if (isImage && thumbnailUrl) {
                  return (
                    <a
                      key={file.id}
                      href={file.permalink || file.url_private}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group relative rounded-lg overflow-hidden border border-border/40 bg-muted/20 hover:border-border transition-all hover:shadow-md"
                    >
                      <img
                        src={thumbnailUrl}
                        alt={file.title || file.name}
                        className="w-full h-auto max-h-[300px] object-contain transition-transform group-hover:scale-[1.02] bg-muted/10"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between text-white text-xs">
                          <span className="truncate flex-1">{file.title || file.name}</span>
                          {file.size && <span className="ml-2">{formatFileSize(file.size)}</span>}
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to view full size
                      </div>
                    </a>
                  );
                }

                // Other files: render as list item
                return (
                  <a
                    key={file.id}
                    href={file.permalink || file.url_private}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/40"
                  >
                    <div className="p-1.5 rounded bg-muted/50">
                      <FileIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{file.title || file.name}</div>
                      {file.filetype && (
                        <div className="text-[10px] text-muted-foreground uppercase">{file.filetype}</div>
                      )}
                    </div>
                    {file.size && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatFileSize(file.size)}</span>
                    )}
                  </a>
                );
              })}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {message.reactions.map((reaction: SlackReaction) => (
                <button
                  key={reaction.name}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/30 hover:bg-muted/60 text-xs border border-border/30 hover:border-border/60 transition-all cursor-pointer"
                >
                  <span className="text-sm">{reaction.name}</span>
                  <span className="text-muted-foreground font-medium">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Channel Tag - Subtle */}
          <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-border/20">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
              {isDM ? <MessageSquare className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
              <span className="font-medium">{displayChannelName}</span>
            </div>

            {/* Hover Actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                aria-label="Add reaction"
              >
                <span className="text-xs">😊</span>
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                aria-label="More actions"
              >
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thread indicator line for threaded messages */}
      {isThread && <div className="absolute left-[2.125rem] top-12 bottom-2 w-0.5 bg-purple-500/20 rounded-full" />}
    </button>
  );
}
