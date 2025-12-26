export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export type ModelMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | Array<any> }
  | { role: "assistant"; content: string | Array<any>; toolCalls?: ToolCall[] }
  | { role: "tool"; content: any[] };

export interface ModelGenerateOptions {
  prompt: string;
  messages?: ModelMessage[];
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: Record<string, any>;
}

export interface ModelStreamOptions {
  prompt: string;
  messages?: ModelMessage[];
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: Record<string, any>;
}

export interface ModelGenerateResult {
  text: string;
  toolCalls?: ToolCall[];
}
