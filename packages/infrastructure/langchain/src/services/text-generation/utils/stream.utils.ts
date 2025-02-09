interface StreamOptions {
  delay?: number;
  cursor?: string;
  prefix?: string;
  silent?: boolean;
}

/**
 * Creates a smooth visual stream of text in the terminal
 */
export async function smoothStream(stream: AsyncIterable<string>, options: StreamOptions = {}): Promise<string> {
  const { delay = 50, cursor = "▌", prefix = "Streaming response:", silent = false } = options;

  let result = "";
  let currentLine = "";
  const terminalWidth = process.stdout.columns || 80;

  if (!silent) {
    process.stdout.write(`${prefix}\n${cursor}`);
  }

  for await (const chunk of stream) {
    result += chunk;

    if (!silent) {
      currentLine += chunk;

      // Handle word wrapping and line breaks
      if (currentLine.length >= terminalWidth - 10 || chunk.includes("\n")) {
        process.stdout.write(`\r${currentLine}\n${cursor}`);
        currentLine = "";
      } else {
        process.stdout.write(`\r${currentLine}${cursor}`);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Clean up final line
  if (!silent && currentLine.length > 0) {
    process.stdout.write(`\r${currentLine}\n`);
  }

  return result;
}
