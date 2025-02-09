import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { smoothStream } from "./stream.utils";

// A helper async generator that yields each string in the provided array.
async function* asyncStreamGenerator(chunks: string[]): AsyncIterable<string> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

describe("smoothStream", () => {
  let originalStdoutWrite: typeof process.stdout.write;
  let capturedOutput: string[];

  beforeEach(() => {
    // Save the original stdout.write function
    originalStdoutWrite = process.stdout.write.bind(process.stdout);
    capturedOutput = [];
    // Override process.stdout.write to capture output
    process.stdout.write = (chunk: any, ...args: any[]): boolean => {
      capturedOutput.push(String(chunk));
      return true;
    };
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
  });

  it("should return concatenated text from stream in silent mode", async () => {
    const chunks = ["Hello", " ", "World", "!"];
    const stream = asyncStreamGenerator(chunks);

    const result = await smoothStream(stream, { silent: true, delay: 0 });
    assert.strictEqual(result, "Hello World!");

    assert.deepEqual(capturedOutput, []);
  });

  it("should write to stdout in non-silent mode", async () => {
    const chunks = ["Test", " ", "stream", "\n", "end"];
    const stream = asyncStreamGenerator(chunks);

    const result = await smoothStream(stream, {
      silent: false,
      delay: 0,
      prefix: "Streaming response:",
    });
    assert.strictEqual(result, "Test stream\nend");

    const outputStr = capturedOutput.join("");
    assert.ok(outputStr.includes("Streaming response:"), "Output should contain the prefix");
    assert.ok(outputStr.includes("▌"), "Output should contain the cursor");
  });
});
