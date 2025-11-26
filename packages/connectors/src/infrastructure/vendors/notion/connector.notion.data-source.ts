import { requestJson } from "@ait/core";
import { AItError, RateLimitError } from "@ait/core";
import type { NotionPageExternal } from "@ait/core";

export interface IConnectorNotionDataSource {
  fetchPages(cursor?: string): Promise<{ pages: NotionPageExternal[]; nextCursor?: string }>;
}

type NotionPageRaw = Omit<NotionPageExternal, "__type"> & {
  object: string;
};

interface NotionSearchResponse {
  object: string;
  results: NotionPageRaw[];
  next_cursor: string | null;
  has_more: boolean;
}

interface NotionBlock {
  object: string;
  id: string;
  type: string;
  [key: string]: unknown;
}

interface NotionBlockResponse {
  object: string;
  results: NotionBlock[];
  next_cursor: string | null;
  has_more: boolean;
}

interface NotionRichText {
  type: string;
  plain_text?: string;
  text?: {
    content: string;
  };
  annotations?: Record<string, unknown>;
}

export class ConnectorNotionDataSource implements IConnectorNotionDataSource {
  private readonly apiUrl: string;
  private accessToken: string;

  constructor(accessToken: string) {
    this.apiUrl = process.env.NOTION_API_ENDPOINT || "https://api.notion.com/v1";
    this.accessToken = accessToken;
  }

  /**
   * Extracts plain text from Notion rich text array
   */
  private extractTextFromRichText(richText: NotionRichText[] | undefined): string {
    if (!richText || !Array.isArray(richText)) {
      return "";
    }
    return richText
      .map((rt) => rt.plain_text || rt.text?.content || "")
      .join("")
      .trim();
  }

  /**
   * Fetches page content (blocks) from Notion API
   * See: https://developers.notion.com/reference/get-block-children
   */
  private async fetchPageContent(pageId: string): Promise<string> {
    const contentParts: string[] = [];
    let nextCursor: string | null = null;

    try {
      do {
        // Build URL with query parameters for GET request
        const queryParams = new URLSearchParams();
        queryParams.append("page_size", "100");
        if (nextCursor) {
          queryParams.append("start_cursor", nextCursor);
        }

        const blocksUrl = `${this.apiUrl}/blocks/${pageId}/children?${queryParams.toString()}`;

        const result = await requestJson<NotionBlockResponse>(blocksUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
        });

        if (!result.ok) {
          // If we can't fetch blocks, return empty content rather than failing
          console.warn(`Failed to fetch blocks for page ${pageId}:`, result.error);
          return "";
        }

        const response = result.value.data as NotionBlockResponse;

        if (!response || !response.results || !Array.isArray(response.results)) {
          break;
        }

        // Extract text from blocks
        for (const block of response.results) {
          const blockType = block.type;

          // Handle different block types
          if (block[blockType]) {
            const blockData = block[blockType] as Record<string, unknown>;

            // Extract rich_text from paragraph, heading, etc.
            if (blockData.rich_text && Array.isArray(blockData.rich_text)) {
              const text = this.extractTextFromRichText(blockData.rich_text as NotionRichText[]);
              if (text) {
                contentParts.push(text);
              }
            }

            // Handle code blocks
            if (blockType === "code" && blockData.rich_text) {
              const codeText = this.extractTextFromRichText(blockData.rich_text as NotionRichText[]);
              if (codeText) {
                contentParts.push(`Code: ${codeText}`);
              }
            }

            // Handle list items
            if (
              (blockType === "bulleted_list_item" || blockType === "numbered_list_item" || blockType === "to_do") &&
              blockData.rich_text
            ) {
              const itemText = this.extractTextFromRichText(blockData.rich_text as NotionRichText[]);
              if (itemText) {
                contentParts.push(`• ${itemText}`);
              }
            }
          }
        }

        nextCursor = response.next_cursor;
      } while (nextCursor);

      return contentParts.join("\n").trim();
    } catch (error: any) {
      console.warn(`Error fetching content for page ${pageId}:`, error.message);
      return "";
    }
  }

  /**
   * Fetches all pages accessible to the integration
   * Note: Nested pages (pages inside other pages) will only be returned if they are
   * explicitly shared with the integration. The search endpoint returns all pages
   * the integration has access to, regardless of their parent.
   * See: https://developers.notion.com/reference/post-search
   */
  async fetchPages(cursor?: string): Promise<{ pages: NotionPageExternal[]; nextCursor?: string }> {
    const searchUrl = `${this.apiUrl}/search`;

    try {
      // Search for pages - this includes nested pages if they're shared with the integration
      const requestBody: Record<string, unknown> = {
        filter: {
          property: "object",
          value: "page",
        },
        page_size: 50, // Reduced batch size for better control
      };

      if (cursor) {
        requestBody.start_cursor = cursor;
      }

      const result = await requestJson<NotionSearchResponse>(searchUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!result.ok) {
        throw result.error;
      }

      const response = result.value.data;

      if (!response || !Array.isArray(response.results)) {
        throw new AItError("NOTION_NO_DATA", "Notion API returned invalid response structure");
      }

      const pages = await Promise.all(
        response.results
          .filter((page: NotionPageRaw) => page.object === "page")
          .map(async (page: NotionPageRaw) => {
            // Fetch page content
            const content = await this.fetchPageContent(page.id);

            return {
              id: page.id,
              created_time: page.created_time,
              last_edited_time: page.last_edited_time,
              created_by: page.created_by || { object: "user", id: "" },
              last_edited_by: page.last_edited_by || { object: "user", id: "" },
              cover: page.cover || null,
              icon: page.icon || null,
              parent: page.parent || { type: "workspace" },
              archived: page.archived || false,
              properties: page.properties || {},
              url: page.url || "",
              content: content || null,
              __type: "page" as const,
            } as NotionPageExternal;
          }),
      );

      // Sort by last edited time (most recent first)
      const sortedPages = pages.sort((a, b) => {
        return new Date(b.last_edited_time).getTime() - new Date(a.last_edited_time).getTime();
      });

      return {
        pages: sortedPages,
        nextCursor: response.next_cursor || undefined,
      };
    } catch (error: any) {
      if (error instanceof AItError) {
        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          const headers = (error.meta?.headers as Record<string, string>) || {};
          const retryAfter = headers["retry-after"];
          const resetTime = retryAfter ? Date.now() + Number.parseInt(retryAfter, 10) * 1000 : Date.now() + 60 * 1000;
          throw new RateLimitError("notion", resetTime, "Notion rate limit exceeded");
        }
        throw error;
      }
      throw new AItError("NETWORK", `Network error: ${error.message}`, undefined, error);
    }
  }
}
