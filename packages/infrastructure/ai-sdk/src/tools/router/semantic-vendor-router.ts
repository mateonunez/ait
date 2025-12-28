import type { MCPVendor } from "../../mcp";
import { cosineSimilarity } from "../../utils/vector.utils";

export type Embedder = (text: string) => Promise<number[]>;

type VendorScore = { vendor: MCPVendor; score: number };

/**
 * Small multilingual “intent prototypes” per vendor.
 * These are NOT keyword heuristics; they are embedded and compared semantically.
 */
const VENDOR_PROTOTYPES: Record<MCPVendor, string[]> = {
  notion: ["create a page in Notion", "search Notion pages", "crea una pagina su Notion", "cerca una pagina su Notion"],
  slack: [
    "post a message to Slack",
    "send a Slack message to a channel",
    "invia un messaggio su Slack",
    "scrivi su un canale Slack",
  ],
  github: ["create a GitHub issue", "open a pull request", "crea una issue su GitHub", "apri una pull request"],
  linear: ["create a Linear issue", "update a Linear issue", "crea un ticket su Linear", "aggiorna un issue su Linear"],
};

const prototypeEmbeddingCache = new Map<string, number[]>();

async function getPrototypeEmbedding(embed: Embedder, vendor: MCPVendor, proto: string): Promise<number[]> {
  const key = `${vendor}::${proto}`;
  const cached = prototypeEmbeddingCache.get(key);
  if (cached) return cached;
  const vec = await embed(proto);
  prototypeEmbeddingCache.set(key, vec);
  return vec;
}

export async function inferMcpVendorsSemantically(args: {
  prompt: string;
  embed: Embedder;
  /** Select vendors with score >= threshold */
  threshold?: number;
  /** Ensure at least topK vendors are selected when above minScore */
  topK?: number;
  minScore?: number;
}): Promise<VendorScore[]> {
  const threshold = args.threshold ?? 0.32;
  const topK = args.topK ?? 2;
  const minScore = args.minScore ?? 0.22;

  const promptVec = await args.embed(args.prompt);

  const scores: VendorScore[] = [];
  for (const vendor of Object.keys(VENDOR_PROTOTYPES) as MCPVendor[]) {
    const protos = VENDOR_PROTOTYPES[vendor] ?? [];
    let best = 0;
    for (const proto of protos) {
      const protoVec = await getPrototypeEmbedding(args.embed, vendor, proto);
      const sim = cosineSimilarity(promptVec, protoVec);
      if (sim > best) best = sim;
    }
    scores.push({ vendor, score: best });
  }

  const byScore = [...scores].sort((a, b) => b.score - a.score);
  const selected = byScore.filter((s) => s.score >= threshold);

  if (selected.length === 0) {
    return byScore.filter((s) => s.score >= minScore).slice(0, topK);
  }

  return selected;
}
