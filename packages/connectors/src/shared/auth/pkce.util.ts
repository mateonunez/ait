import { createHash, randomBytes } from "node:crypto";

export type PkcePair = { verifier: string; challenge: string; method: "S256" };

export function generatePkcePair(): PkcePair {
  const verifier = randomBytes(32).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const challengeBuffer = createHash("sha256").update(verifier).digest();
  const challenge = Buffer.from(challengeBuffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return { verifier, challenge, method: "S256" };
}
