import { requestJson, AItError, getLogger } from "@ait/core";
import type { SlackMessageExternal, SlackApiResponse, SlackUser, SlackConversation } from "@ait/core";

export interface IConnectorSlackDataSource {
  fetchMessages(cursor?: string): Promise<{ messages: SlackMessageExternal[]; nextCursor?: string }>;
}

// Internal API response types - these are implementation-specific and stay here
interface SlackConversationsListResponse extends SlackApiResponse<SlackConversation[]> {
  channels: SlackConversation[];
  response_metadata?: {
    next_cursor?: string;
  };
}

// Internal API response type - uses SlackMessageExternal for the raw API response
interface SlackConversationsHistoryResponse extends SlackApiResponse<SlackMessageExternal[]> {
  messages: SlackMessageExternal[];
  has_more: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
}

// Internal API response types
interface SlackUsersListResponse extends SlackApiResponse<SlackUser[]> {
  members: SlackUser[];
  response_metadata?: {
    next_cursor?: string;
  };
}

interface SlackUsersInfoResponse extends SlackApiResponse<SlackUser> {
  user: SlackUser;
}

export class ConnectorSlackDataSource implements IConnectorSlackDataSource {
  private readonly apiUrl: string;
  private accessToken: string;
  private userCache: Map<string, SlackUser> = new Map();
  private conversationCache: SlackConversation[] | null = null;
  private workspaceUrl?: string;
  private _logger = getLogger();

  constructor(accessToken: string) {
    this.apiUrl = process.env.SLACK_API_ENDPOINT || "https://slack.com/api";
    this.accessToken = accessToken;
  }

  /**
   * Fetches all workspace users at once and caches them
   * More efficient than fetching users one-by-one
   * See: https://api.slack.com/methods/users.list
   */
  private async fetchAllUsers(): Promise<void> {
    if (this.userCache.size > 0) {
      return; // Already fetched
    }

    let cursor: string | undefined;

    try {
      do {
        const url = `${this.apiUrl}/users.list`;
        const params = new URLSearchParams({
          limit: "200", // Max limit per Slack API
        });

        if (cursor) {
          params.append("cursor", cursor);
        }

        const result = await requestJson<SlackUsersListResponse>(`${url}?${params.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        if (!result.ok) {
          console.warn("Failed to fetch users list:", result.error);
          break;
        }

        const response = result.value.data;
        if (!response.ok || !response.members) {
          break;
        }

        // Cache all users except deleted and bots
        for (const user of response.members) {
          if (!user.deleted && !user.is_bot) {
            this.userCache.set(user.id, user);
          }
        }

        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      console.log(`Cached ${this.userCache.size} workspace users`);
    } catch (error: any) {
      console.warn("Error fetching users list:", error.message);
    }
  }

  /**
   * Gets user from cache or returns null
   */
  private _getUserFromCache(userId: string): SlackUser | null {
    return this.userCache.get(userId) || null;
  }

  /**
   * Gets workspace URL for building permalinks
   * See: https://api.slack.com/methods/team.info
   */
  private async _getWorkspaceUrl(): Promise<string> {
    if (this.workspaceUrl) {
      return this.workspaceUrl;
    }

    try {
      const url = `${this.apiUrl}/team.info`;
      const result = await requestJson<{ ok: boolean; team?: { url?: string } }>(`${url}`, {
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
      console.warn("Error fetching workspace URL:", error.message);
    }

    return "https://slack.com"; // Fallback
  }

  /**
   * Builds a permalink to a Slack message
   * Format: https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP
   */
  private async _buildPermalink(channelId: string, ts: string): Promise<string> {
    const workspaceUrl = await this._getWorkspaceUrl();
    const timestamp = ts.replace(".", "");
    return `${workspaceUrl}/archives/${channelId}/p${timestamp}`;
  }

  /**
   * Fetches all conversations (channels, DMs, group DMs) accessible to the app
   */
  private async fetchConversations(): Promise<SlackConversation[]> {
    if (this.conversationCache) {
      return this.conversationCache;
    }

    const allConversations: SlackConversation[] = [];
    let cursor: string | undefined;

    try {
      do {
        const url = `${this.apiUrl}/conversations.list`;
        const params = new URLSearchParams({
          exclude_archived: "true",
          types: "public_channel,private_channel,im,mpim",
          limit: "200",
        });

        if (cursor) {
          params.append("cursor", cursor);
        }

        const result = await requestJson<SlackConversationsListResponse>(`${url}?${params.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        if (!result.ok) {
          throw result.error;
        }

        const response = result.value.data;
        if (!response.ok) {
          throw new AItError("SLACK_API_ERROR", response.error || "Failed to fetch conversations");
        }

        if (response.channels && Array.isArray(response.channels)) {
          allConversations.push(...response.channels);
        }

        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      this.conversationCache = allConversations.sort((a, b) => a.id.localeCompare(b.id));
      return this.conversationCache;
    } catch (error: any) {
      if (error instanceof AItError) {
        throw error;
      }
      throw new AItError("NETWORK", `Network error fetching conversations: ${error.message}`, undefined, error);
    }
  }

  /**
   * Enriches messages with user information and permalinks
   */
  private async _enrichMessages(messages: SlackMessageExternal[]): Promise<SlackMessageExternal[]> {
    const enrichedMessages: SlackMessageExternal[] = [];

    for (const message of messages) {
      if (!message.channel) {
        console.warn("Skipping message without channel:", message.ts);
        continue;
      }

      let userName: string | null = null;

      if (message.user) {
        const userInfo = this._getUserFromCache(message.user);
        userName = userInfo?.profile?.real_name || userInfo?.real_name || userInfo?.name || null;
      }

      // Build permalink
      const permalink = await this._buildPermalink(message.channel, message.ts);

      enrichedMessages.push({
        ...message,
        userName,
        permalink,
      });
    }

    return enrichedMessages;
  }

  /**
   * Fetches message history for a specific conversation
   */
  /**
   * Fetches message history for a specific conversation (single page)
   */
  private async fetchConversationHistoryPage(
    channelId: string,
    channelName: string,
    cursor?: string,
  ): Promise<{ messages: SlackMessageExternal[]; nextCursor?: string }> {
    const oldest = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60; // Last 90 days

    try {
      const url = `${this.apiUrl}/conversations.history`;
      const params = new URLSearchParams({
        channel: channelId,
        limit: "50", // Batch size
        oldest: oldest.toString(),
        include_all_metadata: "true",
      });

      if (cursor) {
        params.append("cursor", cursor);
      }

      const result = await requestJson<SlackConversationsHistoryResponse>(`${url}?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!result.ok) {
        throw result.error;
      }

      const response = result.value.data;
      if (!response.ok) {
        // Some channels might not be accessible, skip them gracefully
        if (
          response.error === "channel_not_found" ||
          response.error === "not_authed" ||
          response.error === "not_in_channel"
        ) {
          console.debug(`Skipping channel ${channelName} (${channelId}): ${response.error}`);
          return { messages: [], nextCursor: undefined };
        }
        throw new AItError("SLACK_API_ERROR", response.error || "Failed to fetch conversation history");
      }

      let messages: SlackMessageExternal[] = [];
      if (response.messages && Array.isArray(response.messages)) {
        messages = response.messages
          .filter((msg) => {
            return msg.text && msg.ts && !msg.bot_id && !msg.subtype;
          })
          .map(
            (msg): SlackMessageExternal => ({
              ...msg,
              channel: channelId,
              channelName: channelName,
              reply_count: msg.reply_count || 0,
              files: msg.files || [],
              attachments: msg.attachments || [],
              reactions: msg.reactions || [],
              pinned_to: msg.pinned_to || [],
              __type: "message" as const,
            }),
          );
      }

      const enrichedMessages = await this._enrichMessages(messages);

      return {
        messages: enrichedMessages,
        nextCursor:
          response.has_more && response.response_metadata?.next_cursor
            ? response.response_metadata.next_cursor
            : undefined,
      };
    } catch (error: any) {
      if (error instanceof AItError) {
        throw error;
      }
      throw new AItError(
        "NETWORK",
        `Network error fetching history for ${channelName}: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Fetches all messages from all accessible conversations
   */
  /**
   * Fetches messages with pagination across all conversations
   */
  async fetchMessages(cursorStr?: string): Promise<{ messages: SlackMessageExternal[]; nextCursor?: string }> {
    try {
      await this.fetchAllUsers();
      const conversations = await this.fetchConversations();

      let channelIndex = 0;
      let messageCursor: string | undefined;

      if (cursorStr) {
        try {
          const parsed = JSON.parse(cursorStr);
          channelIndex = parsed.channelIndex || 0;
          messageCursor = parsed.messageCursor;
        } catch {
          // Invalid cursor, start from beginning
          this._logger.warn("Invalid cursor, starting from beginning");
        }
      }

      while (channelIndex < conversations.length) {
        const conversation = conversations[channelIndex];
        if (!conversation) {
          channelIndex++;
          continue;
        }
        const channelName = conversation.name || conversation.id;

        // Check if we should process this channel
        if (conversation.is_im || conversation.is_mpim || conversation.is_member !== false) {
          const { messages, nextCursor } = await this.fetchConversationHistoryPage(
            conversation.id,
            channelName,
            messageCursor,
          );

          if (messages.length > 0 || nextCursor) {
            // We found messages or there are more messages in this channel
            const newCursor = nextCursor
              ? JSON.stringify({ channelIndex, messageCursor: nextCursor })
              : JSON.stringify({ channelIndex: channelIndex + 1 }); // Move to next channel next time

            // Sort by timestamp (most recent first) within the batch
            const sortedMessages = messages.sort((a, b) => Number.parseFloat(b.ts) - Number.parseFloat(a.ts));

            return {
              messages: sortedMessages,
              nextCursor: newCursor,
            };
          }
        }

        // Move to next channel immediately if current one is skipped or empty
        channelIndex++;
        messageCursor = undefined;
      }

      return { messages: [], nextCursor: undefined };
    } catch (error: any) {
      if (error instanceof AItError) {
        throw error;
      }
      throw new AItError("NETWORK", `Network error fetching messages: ${error.message}`, undefined, error);
    }
  }
}
