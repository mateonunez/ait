import { requestJson } from "@ait/core";
import { AItError, RateLimitError } from "@ait/core";
import type { LinearIssueExternal } from "@ait/core";

export interface IConnectorLinearDataSource {
  fetchIssues(cursor?: string): Promise<{ issues: LinearIssueExternal[]; nextCursor?: string }>;
}

interface LinearGraphQLResponse {
  data?: {
    issues: {
      nodes: any[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

export class ConnectorLinearDataSource implements IConnectorLinearDataSource {
  private readonly apiUrl: string;
  private accessToken: string;

  constructor(accessToken: string) {
    this.apiUrl = process.env.LINEAR_API_ENDPOINT || "https://api.linear.app/graphql";
    this.accessToken = accessToken;
  }

  async fetchIssues(cursor?: string): Promise<{ issues: LinearIssueExternal[]; nextCursor?: string }> {
    const query = `
      query($after: String) {
        issues(first: 50, after: $after, orderBy: updatedAt) {
          nodes {
            id
            title
            description
            state {
              name
            }
            priority
            assignee {
              id
              name
            }
            team {
              id
              name
            }
            project {
              id
              name
            }
            url
            labels {
              nodes {
                name
              }
            }
            createdAt
            updatedAt
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    try {
      const result = await requestJson<LinearGraphQLResponse>(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables: { after: cursor } }),
      });

      if (!result.ok) {
        throw result.error;
      }

      const payload = result.value.data;
      if (payload.errors) {
        throw new AItError("LINEAR_GRAPHQL", `Linear GraphQL errors: ${JSON.stringify(payload.errors)}`);
      }

      if (!payload.data) {
        throw new AItError("LINEAR_NO_DATA", "Linear API returned no data");
      }
      const issues = payload.data.issues.nodes.map((issue: any) => ({
        ...issue,
        __type: "issue" as const,
      }));

      const sortedIssues = issues.sort((a, b) => {
        // Priority (higher priority first, 0 = urgent, 4 = low)
        const priorityA = a.priority ?? 4;
        const priorityB = b.priority ?? 4;
        if (priorityA !== priorityB) {
          return priorityA - priorityB; // Lower number = higher priority
        }

        // State priority (In Progress > Todo > Done)
        const statePriority: Record<string, number> = {
          "In Progress": 1,
          Todo: 2,
          Done: 3,
          Canceled: 4,
          Backlog: 5,
        };
        const stateA = statePriority[a.state?.name] || 99;
        const stateB = statePriority[b.state?.name] || 99;
        if (stateA !== stateB) {
          return stateA - stateB;
        }

        // Updated date (most recent first)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      return {
        issues: sortedIssues,
        nextCursor: payload.data.issues.pageInfo.hasNextPage ? payload.data.issues.pageInfo.endCursor : undefined,
      };
    } catch (error: any) {
      if (error instanceof AItError) {
        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          const headers = (error.meta?.headers as Record<string, string>) || {};
          const reset = headers["x-ratelimit-reset"];
          const resetTime = reset ? Number.parseInt(reset, 10) * 1000 : Date.now() + 60 * 60 * 1000;
          throw new RateLimitError("linear", resetTime, "Linear rate limit exceeded");
        }
        throw error;
      }
      throw new AItError("NETWORK", `Network error: ${error.message}`, undefined, error);
    }
  }
}
