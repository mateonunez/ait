import { getEncoding } from "js-tiktoken";
import type { ChatMessage } from "../../types/chat";

export class TokenizerService {
  private readonly encoder = getEncoding("cl100k_base"); // Standard for GPT-4/Turbo

  countTokens(text: string): number {
    if (!text) return 0;
    return this.encoder.encode(text).length;
  }

  countMessages(messages: ChatMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      const messageText = `${msg.role}: ${msg.content}`;
      total += this.countTokens(messageText);
      total += 4; // Buffer for message formatting overhead
    }
    return total;
  }
}

let _tokenizer: TokenizerService | null = null;

export function getTokenizer(): TokenizerService {
  if (!_tokenizer) {
    _tokenizer = new TokenizerService();
  }
  return _tokenizer;
}
