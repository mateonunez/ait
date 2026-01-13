import {
  STREAM_EVENT,
  type StreamEvent,
  isCompletionData,
  isErrorEvent,
  isMetadataChunk,
  isTextChunk,
} from "@ait/ai-sdk";
import type { FastifyReply } from "fastify";

declare global {
  var __messageToTraceMap: Record<string, string>;
}

if (!globalThis.__messageToTraceMap) {
  globalThis.__messageToTraceMap = {};
}

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
    let firstChunk = true;

    for await (const chunk of stream) {
      if (typeof chunk === "string") {
        assistantResponse += chunk;
        if (onText) onText(chunk);
        reply.raw.write(`${STREAM_EVENT.TEXT}:${JSON.stringify(chunk)}\n`);
      } else {
        const event = chunk as StreamEvent;
        if (!event) continue;

        if (isTextChunk(event)) {
          const data = typeof event.data === "string" ? event.data : JSON.stringify(event.data);
          assistantResponse += data;
          if (onText) onText(data);
          reply.raw.write(`${STREAM_EVENT.TEXT}:${JSON.stringify(event.data)}\n`);
        } else if (isMetadataChunk(event)) {
          reply.raw.write(`${STREAM_EVENT.METADATA}:${JSON.stringify(event.data)}\n`);
        } else if (isCompletionData(event)) {
          reply.raw.write(`${STREAM_EVENT.DATA}:${JSON.stringify(event.data)}\n`);
        } else if (isErrorEvent(event)) {
          hadError = true;
          if (onError) onError(event.data);
          reply.raw.write(`${STREAM_EVENT.ERROR}:${JSON.stringify(event.data)}\n`);
        } else if (event.type === STREAM_EVENT.REASONING) {
          reply.raw.write(`${STREAM_EVENT.REASONING}:${JSON.stringify(event.data)}\n`);
        }
      }

      if (firstChunk) {
        this.trackTraceId(traceId);
        firstChunk = false;
      }
    }

    return { assistantResponse, hadError };
  }

  private trackTraceId(traceId: string): void {
    const timestamp = Date.now();
    globalThis.__messageToTraceMap[timestamp] = traceId;

    // Cleanup old traces (older than 5 minutes)
    const fiveMinutesAgo = timestamp - 5 * 60 * 1000;
    for (const key of Object.keys(globalThis.__messageToTraceMap)) {
      if (Number.parseInt(key) < fiveMinutesAgo) {
        delete globalThis.__messageToTraceMap[key];
      }
    }
  }
}

let chatStreamHandler: ChatStreamHandler | null = null;

export function getChatStreamHandler(): ChatStreamHandler {
  if (!chatStreamHandler) {
    chatStreamHandler = new ChatStreamHandler();
  }
  return chatStreamHandler;
}
