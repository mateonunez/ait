import type { MCPClientManager } from "@ait/ai-sdk";
import type { UserConnectorServices } from "@ait/connectors";
import { getLogger } from "@ait/core";

const logger = getLogger();

export interface IMCPInitializerService {
  initializeForUser(userId: string, mcpManager: MCPClientManager, services: UserConnectorServices): Promise<void>;
  isInitializedForUser(userId: string): boolean;
}

export class MCPInitializerService implements IMCPInitializerService {
  private _mcpInitializedUsers = new Set<string>();

  async initializeForUser(
    userId: string,
    mcpManager: MCPClientManager,
    services: UserConnectorServices,
  ): Promise<void> {
    if (this._mcpInitializedUsers.has(userId)) {
      return;
    }

    if (services.notion) {
      try {
        await services.notion.connector.connect();
        const notionAuth = await services.notion.connector.store.getAuthenticationData();
        if (notionAuth?.accessToken) {
          await mcpManager.connect("notion", { accessToken: notionAuth.accessToken });
          logger.info("🔌 MCP: Connected to Notion");
        }
      } catch (error) {
        logger.debug("[MCP] Notion not authenticated, skipping MCP connection", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Try to connect GitHub MCP if authenticated
    if (services.github) {
      try {
        await services.github.connector.connect();
        const githubAuth = await services.github.connector.store.getAuthenticationData();
        if (githubAuth?.accessToken) {
          await mcpManager.connect("github", { accessToken: githubAuth.accessToken });
          logger.info("🔌 MCP: Connected to GitHub");
        }
      } catch (error) {
        logger.debug("[MCP] GitHub not authenticated, skipping MCP connection", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Try to connect Linear MCP if authenticated
    if (services.linear) {
      try {
        await services.linear.connector.connect();
        const linearAuth = await services.linear.connector.store.getAuthenticationData();
        if (linearAuth?.accessToken) {
          await mcpManager.connect("linear", { accessToken: linearAuth.accessToken });
          logger.info("🔌 MCP: Connected to Linear");
        }
      } catch (error) {
        logger.debug("[MCP] Linear not authenticated, skipping MCP connection", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Try to connect Slack MCP if authenticated
    if (services.slack) {
      try {
        await services.slack.connector.connect();
        const slackAuth = await services.slack.connector.store.getAuthenticationData();
        if (slackAuth?.accessToken) {
          const teamId = (slackAuth.metadata as { team_id?: string })?.team_id;
          const env: Record<string, string> = {};
          if (teamId) {
            env.SLACK_TEAM_ID = teamId;
          }
          await mcpManager.connect("slack", { accessToken: slackAuth.accessToken, env });
          logger.info("🔌 MCP: Connected to Slack");
        }
      } catch (error) {
        logger.debug("[MCP] Slack not authenticated, skipping MCP connection", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this._mcpInitializedUsers.add(userId);
  }

  isInitializedForUser(userId: string): boolean {
    return this._mcpInitializedUsers.has(userId);
  }
}

let mcpInitializerService: MCPInitializerService | null = null;

export function getMCPInitializerService(): MCPInitializerService {
  if (!mcpInitializerService) {
    mcpInitializerService = new MCPInitializerService();
  }
  return mcpInitializerService;
}
