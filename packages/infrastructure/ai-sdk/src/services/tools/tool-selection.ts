import type { Tool } from "../../types/tools";

export type InferredEntityType = "page" | "message" | "issue" | "repo" | "pull_request" | "track" | "playlist" | string;

export interface ToolSelectionInput {
  prompt: string;
  inferredTypes?: InferredEntityType[];
  tools: Record<string, Tool>;
}

export interface ToolSelectionResult {
  selectedTools: Record<string, Tool>;
  selectedToolNames: string[];
  originalToolNames: string[];
  selectedVendors: string[];
  writeEnabled: boolean;
  reason: string;
}

type VendorId = "notion" | "slack" | "linear" | "github" | "spotify" | "internal";

type VendorRule = {
  id: VendorId;
  /** Tool name prefix used by MCP tool keys (e.g. `notion_`, `slack_`) */
  toolPrefix?: string;
  /** Extra exact tool names that are not prefix-based */
  toolNames?: string[];
  /** Entity types that imply this vendor */
  types?: string[];
  /** Keywords that imply this vendor */
  keywords?: string[];
};

const VENDOR_RULES: VendorRule[] = [
  { id: "internal", toolPrefix: "chat_" },
  {
    id: "notion",
    toolPrefix: "notion_",
    types: ["page"],
    keywords: ["notion"],
  },
  {
    id: "slack",
    toolPrefix: "slack_",
    types: ["message"],
    keywords: ["slack", "canale", "channel", "#"],
  },
  {
    id: "linear",
    toolPrefix: "linear_",
    types: ["issue"],
    keywords: ["linear"],
  },
  {
    id: "github",
    toolPrefix: "github_",
    types: ["repo", "pull_request"],
    keywords: ["github", "repository", "repo", "pull request"],
  },
  {
    id: "spotify",
    toolNames: ["getCurrentlyPlaying"],
    types: ["track", "playlist"],
    keywords: ["spotify", "playlist", "brano", "playing now"],
  },
];

function inferVendors(prompt: string, inferredTypes: InferredEntityType[] | undefined): Set<VendorId> {
  const text = prompt.toLowerCase();
  const typeSet = new Set((inferredTypes || []).map((t) => String(t).toLowerCase()));

  const vendors = new Set<VendorId>(["internal"]);
  for (const rule of VENDOR_RULES) {
    if (rule.id === "internal") continue;

    const matchesType = (rule.types || []).some((t) => typeSet.has(t));
    const matchesKeyword = (rule.keywords || []).some((k) => text.includes(k));

    if (matchesType || matchesKeyword) {
      vendors.add(rule.id);
    }
  }

  return vendors;
}

function ruleForVendor(vendor: VendorId): VendorRule | undefined {
  return VENDOR_RULES.find((r) => r.id === vendor);
}

function matchesVendorTool(rule: VendorRule, toolName: string): boolean {
  if (rule.toolPrefix && toolName.startsWith(rule.toolPrefix)) return true;
  if (rule.toolNames?.includes(toolName)) return true;
  return false;
}

function toolScore(name: string): number {
  const n = name.toLowerCase();
  let score = 0;
  if (n.includes("search")) score += 50;
  if (n.includes("list")) score += 45;
  if (n.includes("get") || n.includes("retrieve")) score += 35;
  if (n.includes("query")) score += 30;
  if (n.includes("post") || n.includes("create")) score += 20;
  if (n.includes("patch") || n.includes("update")) score += 15;
  if (n.includes("delete")) score += 10;
  return score;
}

export function selectToolsForPrompt(input: ToolSelectionInput): ToolSelectionResult {
  const originalToolNames = Object.keys(input.tools);
  const writeEnabled = true; // make this configurable
  const vendors = inferVendors(input.prompt, input.inferredTypes);

  const selectedTools: Record<string, Tool> = {};
  const selectedToolNames: string[] = [];

  for (const [name, tool] of Object.entries(input.tools)) {
    for (const vendor of vendors) {
      const rule = ruleForVendor(vendor);
      if (!rule) continue;
      if (!matchesVendorTool(rule, name)) continue;
      selectedTools[name] = tool;
      selectedToolNames.push(name);
      break;
    }
  }

  const HARD_CAP = 24;
  if (selectedToolNames.length > HARD_CAP) {
    const internal = selectedToolNames.filter((n) => n.startsWith("chat_"));
    const nonInternal = selectedToolNames
      .filter((n) => !n.startsWith("chat_"))
      .sort((a, b) => toolScore(b) - toolScore(a));
    const capped = [...internal, ...nonInternal].slice(0, HARD_CAP);
    const cappedTools: Record<string, Tool> = {};
    for (const n of capped) cappedTools[n] = selectedTools[n]!;

    return {
      selectedTools: cappedTools,
      selectedToolNames: capped,
      originalToolNames,
      selectedVendors: [...vendors].filter((v) => v !== "internal") as string[],
      writeEnabled,
      reason: `capped_to_${HARD_CAP}`,
    };
  }

  return {
    selectedTools,
    selectedToolNames,
    originalToolNames,
    selectedVendors: [...vendors].filter((v) => v !== "internal") as string[],
    writeEnabled,
    reason: "filtered",
  };
}
