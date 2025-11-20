import type { ChatMessage } from "../../types/chat";

export interface ITokenEstimationService {
  estimateTokens(text: string): number;
  estimateTokensForMessages(messages: ChatMessage[]): number;
}

export class TokenEstimationService implements ITokenEstimationService {
  private readonly _charactersPerToken: number;

  constructor(charactersPerToken = 4) {
    this._charactersPerToken = Math.max(charactersPerToken, 1);
  }

  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / this._charactersPerToken);
  }

  estimateTokensForMessages(messages: ChatMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      const messageText = `${msg.role}: ${msg.content}`;
      total += this.estimateTokens(messageText);
      total += 4;
    }
    return total;
  }
}
