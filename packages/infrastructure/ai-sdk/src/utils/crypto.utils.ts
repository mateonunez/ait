import { createHash } from "node:crypto";

export function computeHash(content: string, algorithm = "md5"): string {
  return createHash(algorithm).update(content).digest("hex");
}
