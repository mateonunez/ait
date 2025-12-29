import { AItError, RateLimitError, getLogger, requestJson } from "@ait/core";
import type { SlackApiResponse, SlackConversation, SlackMessageExternal, SlackUser } from "@ait/core";

export interface IConnectorSlackDataSource {
  fetchMessages(cursor?: string): Promise<{ messages: SlackMessageExternal[]; nextCursor?: string }>;
}

interface SlackConversationsListResponse extends SlackApiResponse<SlackConversation[]> {
  channels: SlackConversation[];
  response_metadata?: { next_cursor?: string };
}

interface SlackConversationsHistoryResponse extends SlackApiResponse<SlackMessageExternal[]> {
  messages: SlackMessageExternal[];
  has_more: boolean;
  is_limited?: boolean;
  response_metadata?: { next_cursor?: string };
}

interface SlackUsersListResponse extends SlackApiResponse<SlackUser[]> {
  members: SlackUser[];
  response_metadata?: { next_cursor?: string };
}

interface SlackThreadRepliesResponse extends SlackApiResponse<SlackMessageExternal[]> {
  messages: SlackMessageExternal[];
  has_more: boolean;
  is_limited?: boolean;
  response_metadata?: { next_cursor?: string };
}

const SYSTEM_SUBTYPES = new Set([
  "channel_join",
  "channel_leave",
  "channel_topic",
  "channel_purpose",
  "channel_name",
  "channel_archive",
  "channel_unarchive",
  "pinned_item",
  "unpinned_item",
  "group_join",
  "group_leave",
  "group_topic",
  "group_purpose",
  "group_name",
  "group_archive",
  "group_unarchive",
]);

function isSystemMessage(msg: any): boolean {
  return msg.subtype && SYSTEM_SUBTYPES.has(msg.subtype);
}

function hasContent(msg: any): boolean {
  return !!(
    msg.text ||
    (msg.files && msg.files.length > 0) ||
    (msg.attachments && msg.attachments.length > 0) ||
    (msg.blocks && msg.blocks.length > 0)
  );
}

function shouldIncludeMessage(msg: any): boolean {
  if (!msg.ts) return false;
  if (isSystemMessage(msg)) return false;
  if (!hasContent(msg)) return false;
  return true;
}

export class ConnectorSlackDataSource implements IConnectorSlackDataSource {
  private readonly apiUrl: string;
  private accessToken: string;
  private userCache: Map<string, SlackUser> = new Map();
  private conversationCache: SlackConversation[] | null = null;
  private conversationCacheTimestamp = 0;
  private workspaceUrl?: string;
  private _logger = getLogger();

  private static readonly CONVERSATION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(accessToken: string) {
    this.apiUrl = process.env.SLACK_API_ENDPOINT || "https://slack.com/api";
    this.accessToken = accessToken;
  }

  public invalidateCache(): void {
    this.conversationCache = null;
    this.conversationCacheTimestamp = 0;
    this._logger.debug("[SlackDataSource] Cache invalidated");
  }

  private isCacheValid(): boolean {
    if (!this.conversationCache) return false;
    return Date.now() - this.conversationCacheTimestamp < ConnectorSlackDataSource.CONVERSATION_CACHE_TTL_MS;
  }

  private async fetchAllUsers(): Promise<void> {
    if (this.userCache.size > 0) return;

    let cursor: string | undefined;

    try {
      do {
        const params = new URLSearchParams({ limit: "200" });
        if (cursor) params.append("cursor", cursor);

        const result = await requestJson<SlackUsersListResponse>(`${this.apiUrl}/users.list?${params.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        if (!result.ok) {
          this._logger.warn("Failed to fetch users list", { error: result.error });
          break;
        }

        const response = result.value.data;
        if (!response.ok || !response.members) break;

        for (const user of response.members) {
          if (!user.deleted) {
            this.userCache.set(user.id, user);
          }
        }

        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      this._logger.debug(`Cached ${this.userCache.size} workspace users`);
    } catch (error: any) {
      this._logger.warn("Error fetching users list", { error: error.message });
    }
  }

  private _getUserFromCache(userId: string): SlackUser | null {
    return this.userCache.get(userId) || null;
  }

  private async _getWorkspaceUrl(): Promise<string> {
    if (this.workspaceUrl) return this.workspaceUrl;

    try {
      const result = await requestJson<{ ok: boolean; team?: { url?: string } }>(`${this.apiUrl}/team.info`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (result.ok && result.value.data.ok && result.value.data.team?.url) {
        this.workspaceUrl = result.value.data.team.url;
        return this.workspaceUrl;
      }
    } catch (error: any) {
      this._logger.warn("Error fetching workspace URL", { error: error.message });
    }

    return "https://slack.com";
  }

  private async _buildPermalink(channelId: string, ts: string): Promise<string> {
    const workspaceUrl = await this._getWorkspaceUrl();
    return `${workspaceUrl}/archives/${channelId}/p${ts.replace(".", "")}`;
  }

  private async fetchConversations(): Promise<SlackConversation[]> {
    if (this.isCacheValid() && this.conversationCache) {
      return this.conversationCache;
    }

    const allConversations: SlackConversation[] = [];
    let cursor: string | undefined;

    try {
      do {
        const params = new URLSearchParams({
          exclude_archived: "true",
          types: "public_channel,private_channel,im,mpim",
          limit: "200",
        });
        if (cursor) params.append("cursor", cursor);

        const result = await requestJson<SlackConversationsListResponse>(
          `${this.apiUrl}/conversations.list?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );

        if (!result.ok) throw result.error;

        const response = result.value.data;
        if (!response.ok) {
          throw new AItError("SLACK_API_ERROR", response.error || "Failed to fetch conversations");
        }

        if (response.channels?.length) {
          allConversations.push(...response.channels);
        }

        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      // Sort by latest activity
      const convWithLatest: (SlackConversation & { latestTs?: number })[] = [];
      for (const conv of allConversations) {
        let latestTs = 0;
        try {
          const historyResult = await requestJson<SlackConversationsHistoryResponse>(
            `${this.apiUrl}/conversations.history?channel=${conv.id}&limit=1&include_all_metadata=true`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
            },
          );

          if (historyResult.ok) {
            const response = historyResult.value.data;
            if (response.ok && response.messages?.[0]) {
              latestTs = Number.parseFloat(response.messages[0].ts || "0");
            }
          }
        } catch {
          // Ignore errors for individual channels
        }

        convWithLatest.push({ ...conv, latestTs });
      }

      convWithLatest.sort((a, b) => (b.latestTs || 0) - (a.latestTs || 0));

      this._logger.info(`[SlackDataSource] Found ${convWithLatest.length} conversations sorted by activity`);

      this.conversationCache = convWithLatest.map(({ latestTs, ...c }) => c);
      this.conversationCacheTimestamp = Date.now();

      return this.conversationCache;
    } catch (error: any) {
      if (error instanceof AItError) throw error;
      throw new AItError("NETWORK", `Network error fetching conversations: ${error.message}`, undefined, error);
    }
  }

  private async _enrichMessages(messages: SlackMessageExternal[]): Promise<SlackMessageExternal[]> {
    const enriched: SlackMessageExternal[] = [];

    for (const message of messages) {
      if (!message.channel) continue;

      let userName: string | null = null;
      if (message.user) {
        const userInfo = this._getUserFromCache(message.user);
        userName = userInfo?.profile?.real_name || userInfo?.real_name || userInfo?.name || null;
      } else if (message.bot_id) {
        const botInfo = this._getUserFromCache(message.bot_id);
        userName = botInfo?.profile?.real_name || botInfo?.real_name || botInfo?.name || "Bot";
      }

      const permalink = await this._buildPermalink(message.channel, message.ts);
      enriched.push({ ...message, userName, permalink });
    }

    return enriched;
  }

  private async fetchThreadReplies(channelId: string, threadTs: string): Promise<SlackMessageExternal[]> {
    const allReplies: SlackMessageExternal[] = [];
    let cursor: string | undefined;

    try {
      do {
        const params = new URLSearchParams({ channel: channelId, ts: threadTs, limit: "15" });
        if (cursor) params.append("cursor", cursor);

        const result = await requestJson<SlackThreadRepliesResponse>(
          `${this.apiUrl}/conversations.replies?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );

        if (!result.ok || !result.value.data.ok) break;

        const response = result.value.data;
        if (response.messages?.length) {
          const replies = response.messages.filter((msg) => msg.ts !== threadTs);
          allReplies.push(...replies);
        }

        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      return allReplies;
    } catch {
      return [];
    }
  }

  private async fetchConversationHistoryPage(
    channelId: string,
    channelName: string,
    cursor?: string,
    oldest?: string,
  ): Promise<{ messages: SlackMessageExternal[]; nextCursor?: string }> {
    try {
      const params = new URLSearchParams({
        channel: channelId,
        limit: "15",
        include_all_metadata: "true",
      });

      if (cursor) params.append("cursor", cursor);
      if (oldest && !cursor) params.append("oldest", oldest);

      const result = await requestJson<SlackConversationsHistoryResponse>(
        `${this.apiUrl}/conversations.history?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      if (!result.ok) throw result.error;

      const response = result.value.data;
      if (!response.ok) {
        const skipErrors = ["channel_not_found", "not_authed", "not_in_channel", "missing_scope"];
        if (skipErrors.includes(response.error || "")) {
          this._logger.info(`Skipping ${channelName}: ${response.error}`);
          return { messages: [], nextCursor: undefined };
        }
        throw new AItError("SLACK_API_ERROR", response.error || "Failed to fetch conversation history");
      }

      if (response.is_limited) {
        this._logger.warn(`${channelName}: History limited by free plan (90 days max)`);
      }

      let messages: SlackMessageExternal[] = [];

      if (response.messages?.length) {
        messages = response.messages.filter(shouldIncludeMessage).map(
          (msg): SlackMessageExternal => ({
            ...msg,
            channel: channelId,
            channelName,
            reply_count: msg.reply_count || 0,
            files: msg.files || [],
            attachments: msg.attachments || [],
            reactions: msg.reactions || [],
            pinned_to: msg.pinned_to || [],
            __type: "slack_message" as const,
          }),
        );
      }

      // Fetch thread replies
      const threadParents = messages.filter(
        (msg) => msg.thread_ts && msg.ts === msg.thread_ts && msg.reply_count && msg.reply_count > 0,
      );

      if (threadParents.length > 0) {
        const replyPromises = threadParents.map(async (parent) => {
          const rawReplies = await this.fetchThreadReplies(channelId, parent.thread_ts!);
          return rawReplies.filter(shouldIncludeMessage).map(
            (reply): SlackMessageExternal => ({
              ...reply,
              channel: channelId,
              channelName,
              reply_count: reply.reply_count || 0,
              files: reply.files || [],
              attachments: reply.attachments || [],
              reactions: reply.reactions || [],
              pinned_to: reply.pinned_to || [],
              __type: "slack_message" as const,
            }),
          );
        });

        const allReplies = await Promise.all(replyPromises);
        for (const replyBatch of allReplies) {
          messages.push(...replyBatch);
        }
      }

      // Sort by timestamp descending
      messages.sort((a, b) => Number.parseFloat(b.ts) - Number.parseFloat(a.ts));

      const enriched = await this._enrichMessages(messages);
      const nextCursor = response.has_more ? response.response_metadata?.next_cursor : undefined;

      this._logger.debug(`[SlackDataSource] ${channelName}: ${enriched.length} messages`);

      return { messages: enriched, nextCursor };
    } catch (error: any) {
      if (error instanceof AItError) throw error;
      throw new AItError("NETWORK", `Network error fetching ${channelName}: ${error.message}`, undefined, error);
    }
  }

  async fetchMessages(cursorStr?: string): Promise<{ messages: SlackMessageExternal[]; nextCursor?: string }> {
    try {
      await this.fetchAllUsers();

      let channelIndex = 0;
      let messageCursor: string | undefined;
      let fetchMode: "recent" | "paginate" = "recent";
      let oldestTimestamp: string | undefined;

      if (cursorStr) {
        try {
          const parsed = JSON.parse(cursorStr);
          channelIndex = parsed.channelIndex || 0;
          messageCursor = parsed.messageCursor;
          fetchMode = parsed.fetchMode || "paginate";
          oldestTimestamp = parsed.oldestTimestamp;
        } catch {
          this._logger.warn("Invalid cursor, starting fresh");
          this.invalidateCache();
        }
      } else {
        this.invalidateCache();
        oldestTimestamp = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000).toString();
        fetchMode = "recent";
        this._logger.info(
          `[SlackDataSource] Fresh fetch since ${new Date(Number(oldestTimestamp) * 1000).toISOString()}`,
        );
      }

      const conversations = await this.fetchConversations();

      if (channelIndex >= conversations.length) {
        this.invalidateCache();
        channelIndex = 0;
        messageCursor = undefined;
        oldestTimestamp = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000).toString();
        fetchMode = "recent";
      }

      let batchMessages: SlackMessageExternal[] = [];
      let currentChannelIndex = channelIndex;
      let currentMessageCursor = messageCursor;

      while (currentChannelIndex < conversations.length && batchMessages.length === 0) {
        const conversation = conversations[currentChannelIndex];
        if (!conversation) {
          currentChannelIndex++;
          continue;
        }

        const channelName = conversation.name || conversation.id;
        const isChannel = !conversation.is_im && !conversation.is_mpim;
        const shouldProcess =
          conversation.is_im ||
          conversation.is_mpim ||
          (isChannel && (!conversation.is_private || conversation.is_member !== false));

        if (shouldProcess) {
          const effectiveOldest = fetchMode === "recent" && !currentMessageCursor ? oldestTimestamp : undefined;

          const { messages, nextCursor } = await this.fetchConversationHistoryPage(
            conversation.id,
            channelName,
            currentMessageCursor,
            effectiveOldest,
          );

          batchMessages = messages;
          currentMessageCursor = nextCursor;

          if (batchMessages.length > 0) {
            let newCursor: string | undefined;

            if (currentMessageCursor) {
              newCursor = JSON.stringify({
                channelIndex: currentChannelIndex,
                messageCursor: currentMessageCursor,
                fetchMode: "paginate",
                oldestTimestamp,
              });
            } else if (currentChannelIndex + 1 < conversations.length) {
              newCursor = JSON.stringify({
                channelIndex: currentChannelIndex + 1,
                fetchMode,
                oldestTimestamp,
              });
            }

            this._logger.info(`[SlackDataSource] Returning ${batchMessages.length} messages from ${channelName}`);
            return { messages: batchMessages, nextCursor: newCursor };
          }

          if (currentMessageCursor) continue;
        }

        currentChannelIndex++;
        currentMessageCursor = undefined;
      }

      this._logger.debug("[SlackDataSource] No messages found, exhausted all channels");
      return { messages: [], nextCursor: undefined };
    } catch (error: any) {
      if (error instanceof AItError) {
        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          const headers = (error.meta?.headers as Record<string, string>) || {};
          const retryAfter = headers["retry-after"];
          const resetTime = retryAfter ? Date.now() + Number.parseInt(retryAfter, 10) * 1000 : Date.now() + 60 * 1000;
          throw new RateLimitError("slack", resetTime, "Slack rate limit exceeded");
        }
        throw error;
      }
      throw new AItError("NETWORK", `Network error fetching messages: ${error.message}`, undefined, error);
    }
  }
}
