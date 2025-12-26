export type ModelMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | Array<any> }
  | { role: "assistant"; content: string | Array<any>; toolCalls?: any[] }
  | { role: "tool"; content: any[] };

export interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

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
  toolCalls?: OllamaToolCall[];
}
