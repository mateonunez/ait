import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function generateEmbedding(text: string): number[] {
  const scriptPath = join(__dirname, "../../scripts/generate_embeddings/generate_embeddings.py");

  if (!existsSync(scriptPath)) {
    throw new Error(`Python script not found: ${scriptPath}`);
  }

  const pythonProcess = spawnSync("python", [scriptPath, text]);

  if (pythonProcess.error) {
    throw new Error(`Failed to run Python script: ${pythonProcess.error.message}`);
  }

  const result = pythonProcess.stdout.toString();
  console.log(`Generated raw embedding JSON for "${text}": ${result}`);

  let embedding: number[];
  try {
    embedding = JSON.parse(result);
  } catch (error: any) {
    console.debug(result);
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }

  if (embedding.length !== 384) {
    throw new Error(`Embedding dimension mismatch: expected 384, got ${embedding.length}`);
  }

  return embedding;
}
