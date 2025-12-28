import type { MCPVendor } from "../../mcp";

export type ToolMetadataKey = `${MCPVendor}:${string}`;

export type ToolExample = {
  title: string;
  input: Record<string, unknown>;
};

export type ToolMetadata = {
  /** Short human-readable title */
  title?: string;
  /** Whether tool has side effects (write operations) */
  sideEffecting?: boolean;
  /** Preconditions that must be satisfied before calling */
  preconditions?: string[];
  /** Examples (kept small) */
  examples?: ToolExample[];
  /** Optional extra instructions for the model */
  guidance?: string[];
  /** Default execution settings (middleware can consume these) */
  timeoutMs?: number;
  maxRetries?: number;
};

/**
 * Config-driven metadata store for MCP tools.
 * Keep this small and structured; avoid dumping long prose blocks.
 */
const METADATA: Record<ToolMetadataKey, ToolMetadata> = {
  "slack:slack_list_channels": {
    title: "List Slack channels",
    sideEffecting: false,
    guidance: ["Use this to resolve a channel name to channel_id before posting."],
  },
  "slack:slack_post_message": {
    title: "Post Slack message",
    sideEffecting: true,
    preconditions: ['Requires "channel_id" and "text".'],
    examples: [
      {
        title: "Post to a channel",
        input: { channel_id: "C01234567", text: "Hello!" },
      },
    ],
  },

  "notion:API-post-search": {
    title: "Search Notion pages",
    sideEffecting: false,
    guidance: ["Use tight queries first.", 'Use returned "id" as page identifier.'],
  },
  "notion:API-post-page": {
    title: "Create Notion page",
    sideEffecting: true,
    preconditions: ["Call API-post-search first to locate a parent page_id."],
  },

  "github:list_repos": {
    title: "List GitHub repositories",
    sideEffecting: false,
    guidance: ["Use this before create_branch/create_issue/create_pull_request if owner/repo is unknown."],
  },
  "github:create_issue": {
    title: "Create GitHub issue",
    sideEffecting: true,
    preconditions: ['Requires "owner" and "repo".'],
  },
  "github:create_pull_request": {
    title: "Create GitHub pull request",
    sideEffecting: true,
    preconditions: ['Requires "owner" and "repo".'],
  },

  "linear:list_projects": {
    title: "List Linear projects",
    sideEffecting: false,
    guidance: ["Use this before creating issues if team/project is unknown."],
  },
  "linear:create_issue": {
    title: "Create Linear issue",
    sideEffecting: true,
    preconditions: ["Requires a team identifier (and optionally a project identifier)."],
  },
};

export function getToolMetadata(vendor: MCPVendor, toolName: string): ToolMetadata | undefined {
  return METADATA[`${vendor}:${toolName}`];
}

export function listMetadataKeys(): ToolMetadataKey[] {
  return Object.keys(METADATA) as ToolMetadataKey[];
}

export function validateMetadataAgainstDiscoveredTools(args: {
  discoveredToolsByVendor: Record<MCPVendor, string[]>;
}): { missingMetadata: Array<{ vendor: MCPVendor; toolName: string }>; unknownMetadataKeys: ToolMetadataKey[] } {
  const discovered = new Set<string>();
  for (const [vendor, names] of Object.entries(args.discoveredToolsByVendor) as Array<[MCPVendor, string[]]>) {
    for (const name of names) discovered.add(`${vendor}:${name}`);
  }

  const unknownMetadataKeys = listMetadataKeys().filter((k) => !discovered.has(k));
  const missingMetadata: Array<{ vendor: MCPVendor; toolName: string }> = [];

  for (const entry of discovered) {
    const [vendor, toolName] = entry.split(":") as [MCPVendor, string];
    // Only require metadata for a small set of high-impact tools for now.
    const shouldHaveMetadata =
      (vendor === "slack" && toolName === "slack_post_message") ||
      (vendor === "notion" && (toolName === "API-post-search" || toolName === "API-post-page"));

    if (shouldHaveMetadata && !METADATA[`${vendor}:${toolName}`]) {
      missingMetadata.push({ vendor, toolName });
    }
  }

  return { missingMetadata, unknownMetadataKeys };
}
