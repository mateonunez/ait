import {
  STREAM_EVENT,
  type StreamEvent,
  isCompletionData,
  isErrorEvent,
  isMetadataChunk,
  isTextChunk,
} from "@ait/ai-sdk";
import type { FastifyReply } from "fastify";

export interface IChatStreamHandler {
  handleStream(options: {
    stream: AsyncIterable<StreamEvent | string>;
    reply: FastifyReply;
    traceId: string;
    onText?: (text: string) => void;
    onError?: (error: any) => void;
  }): Promise<{ assistantResponse: string; hadError: boolean }>;
}

export class ChatStreamHandler implements IChatStreamHandler {
  async handleStream(options: {
    stream: AsyncIterable<StreamEvent | string>;
    reply: FastifyReply;
    traceId: string;
    onText?: (text: string) => void;
    onError?: (error: any) => void;
  }): Promise<{ assistantResponse: string; hadError: boolean }> {
    const { stream, reply, traceId, onText, onError } = options;
    let assistantResponse = "";
    let hadError = false;

    for await (const chunk of stream) {
      if (typeof chunk === "string") {
        assistantResponse += chunk;
        if (onText) onText(chunk);
        this._writeEvent(reply, STREAM_EVENT.TEXT, chunk);
      } else {
        const event = chunk as StreamEvent;
        if (!event) continue;

        if (isTextChunk(event)) {
          const data = typeof event.data === "string" ? event.data : JSON.stringify(event.data);
          assistantResponse += data;
          if (onText) onText(data);
          this._writeEvent(reply, STREAM_EVENT.TEXT, event.data);
        } else if (isMetadataChunk(event)) {
          this._writeEvent(reply, STREAM_EVENT.METADATA, event.data);
        } else if (isCompletionData(event)) {
          const data = { ...event.data, traceId: event.data.traceId || traceId };
          this._writeEvent(reply, STREAM_EVENT.DATA, data);
        } else if (isErrorEvent(event)) {
          hadError = true;
          if (onError) onError(event.data);
          this._writeEvent(reply, STREAM_EVENT.ERROR, event.data);
        } else if (event.type === STREAM_EVENT.REASONING) {
          this._writeEvent(reply, STREAM_EVENT.REASONING, event.data);
        }
      }
    }

    return { assistantResponse, hadError };
  }

  private _writeEvent(reply: FastifyReply, type: string, data: any): void {
    reply.raw.write(`${type}:${JSON.stringify(data)}\n`);
  }
}

let chatStreamHandler: ChatStreamHandler | null = null;

export function getChatStreamHandler(): ChatStreamHandler {
  if (!chatStreamHandler) {
    chatStreamHandler = new ChatStreamHandler();
  }
  return chatStreamHandler;
}
