import { fetch } from "undici";
import type { LinearIssueExternal } from "@/types/domain/entities/vendors/connector.linear.types";

export interface IConnectorLinearDataSource {
  fetchIssues(): Promise<LinearIssueExternal[]>;
}

interface LinearGraphQLResponse {
  data?: {
    issues: {
      nodes: any[];
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

  async fetchIssues(): Promise<LinearIssueExternal[]> {
    const query = `
      query {
        issues(first: 50, orderBy: updatedAt) {
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
            }
            team {
              id
            }
            project {
              id
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
        }
      }
    `;

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ConnectorLinearDataSourceError(
          `Linear API error: ${response.status} ${response.statusText}`,
          errorBody,
        );
      }

      const data = (await response.json()) as LinearGraphQLResponse;

      if (data.errors) {
        throw new ConnectorLinearDataSourceError(
          `Linear GraphQL errors: ${JSON.stringify(data.errors)}`,
          JSON.stringify(data.errors),
        );
      }

      if (!data.data) {
        throw new ConnectorLinearDataSourceError("Linear API returned no data", "");
      }

      const issues = data.data.issues.nodes.map((issue: any) => ({
        ...issue,
        __type: "issue" as const,
      }));

      // Sort by priority (higher first), then state (In Progress > Todo > Done), then by updated date
      return issues.sort((a, b) => {
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
    } catch (error: any) {
      if (error instanceof ConnectorLinearDataSourceError) {
        throw error;
      }
      throw new ConnectorLinearDataSourceError(`Network error: ${error.message}`, "");
    }
  }
}

export class ConnectorLinearDataSourceError extends Error {
  public responseBody: string;

  constructor(message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorLinearDataSourceError";
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorLinearDataSourceError.prototype);
  }
}
