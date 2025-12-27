import type { ChatMessage } from "../types/chat";

export interface CommonRequestOptions {
  model: any;
  system?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: any;
  maxSteps?: number;
}

export function formatMessages(prompt: string, messages?: ChatMessage[]) {
  const msgs = (messages || []).map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  const lastMsg = msgs[msgs.length - 1];
  if (lastMsg && lastMsg.role === "user") {
    lastMsg.content = prompt;
    return msgs;
  }

  return [...msgs, { role: "user" as const, content: prompt }];
}

export function prepareRequestOptions(prompt: string, commonOptions: CommonRequestOptions, messages?: ChatMessage[]) {
  const hasMessages = messages && messages.length > 0;

  if (hasMessages) {
    return {
      ...commonOptions,
      messages: formatMessages(prompt, messages),
    };
  }

  return {
    ...commonOptions,
    prompt,
  };
}
