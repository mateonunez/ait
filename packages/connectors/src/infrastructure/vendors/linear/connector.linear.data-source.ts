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
        issues(first: 50) {
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

      return data.data.issues.nodes.map((issue: any) => ({
        ...issue,
        __type: "issue" as const,
      }));
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
