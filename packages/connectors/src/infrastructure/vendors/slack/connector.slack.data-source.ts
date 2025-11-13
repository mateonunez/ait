import { requestJson, AItError } from "@ait/core";
import type { SlackMessageExternal, SlackApiResponse, SlackUser, SlackConversation } from "@ait/core";

export interface IConnectorSlackDataSource {
  fetchMessages(): Promise<SlackMessageExternal[]>;
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
  private workspaceUrl?: string;

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

      return allConversations;
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
  private async fetchConversationHistory(channelId: string, channelName: string): Promise<SlackMessageExternal[]> {
    const allMessages: SlackMessageExternal[] = [];
    let cursor: string | undefined;
    const oldest = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60; // Last 90 days

    try {
      do {
        const url = `${this.apiUrl}/conversations.history`;
        const params = new URLSearchParams({
          channel: channelId,
          limit: "200",
          oldest: oldest.toString(),
          include_all_metadata: "true", // Include all metadata (files, attachments, reactions, etc.)
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
            break;
          }
          throw new AItError("SLACK_API_ERROR", response.error || "Failed to fetch conversation history");
        }

        if (response.messages && Array.isArray(response.messages)) {
          const messages = response.messages
            .filter((msg) => {
              // Filter out: empty messages, bot messages, system messages
              return (
                msg.text &&
                msg.ts &&
                !msg.bot_id && // Exclude bot messages
                !msg.subtype // Exclude system messages (channel_join, etc)
              );
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

          allMessages.push(...messages);
        }

        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      // Enrich messages with user information and permalinks
      return await this._enrichMessages(allMessages);
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
  async fetchMessages(): Promise<SlackMessageExternal[]> {
    try {
      // Fetch all users upfront for efficient lookup
      await this.fetchAllUsers();

      const conversations = await this.fetchConversations();
      const allMessages: SlackMessageExternal[] = [];

      // Fetch messages from each conversation
      for (const conversation of conversations) {
        try {
          const channelName = conversation.name || conversation.id;

          // For channels (public/private), only fetch if bot is a member
          // For DMs (im/mpim), the bot is automatically "in" the conversation
          if (conversation.is_im || conversation.is_mpim || conversation.is_member !== false) {
            const messages = await this.fetchConversationHistory(conversation.id, channelName);
            allMessages.push(...messages);
          } else {
            console.debug(`Skipping channel ${channelName} - bot is not a member`);
          }
        } catch (error: any) {
          // Handle not_in_channel errors gracefully
          if (error instanceof AItError && error.message?.includes("not_in_channel")) {
            console.debug(`Skipping channel ${conversation.name || conversation.id} - bot not in channel`);
            continue;
          }
          console.error(
            `Failed to fetch messages for conversation ${conversation.name || conversation.id}:`,
            error.message,
          );
          // Continue with other conversations
        }
      }

      // Sort by timestamp (most recent first)
      return allMessages.sort((a, b) => Number.parseFloat(b.ts) - Number.parseFloat(a.ts));
    } catch (error: any) {
      if (error instanceof AItError) {
        throw error;
      }
      throw new AItError("NETWORK", `Network error fetching messages: ${error.message}`, undefined, error);
    }
  }
}
