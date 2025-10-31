import { requestJson } from "@ait/core";
import { AItError } from "@ait/core";
import type { LinearIssueExternal } from "../../../types/domain/entities/vendors/connector.linear.types";

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
      const result = await requestJson<LinearGraphQLResponse>(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
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
      if (error instanceof AItError) {
        throw error;
      }
      throw new AItError("NETWORK", `Network error: ${error.message}`, undefined, error);
    }
  }
}
