import { z } from "zod";

export interface GmailMessageExternal {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: {
    partId?: string;
    mimeType?: string;
    filename?: string;
    headers?: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      size?: number;
      data?: string;
    };
    parts?: Array<GmailMessageExternal["payload"]>; // Recursive structure
  };
  sizeEstimate?: number;
  raw?: string;
}

export interface GmailThreadExternal {
  id: string;
  snippet?: string;
  historyId?: string;
  messages?: GmailMessageExternal[];
}

const GmailHeaderSchema = z.object({
  name: z.string(),
  value: z.string(),
});

const GmailBodySchema = z.object({
  size: z.number().optional(),
  data: z.string().optional(),
});

const GmailPayloadSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    partId: z.string().optional(),
    mimeType: z.string().optional(),
    filename: z.string().optional(),
    headers: z.array(GmailHeaderSchema).optional(),
    body: GmailBodySchema.optional(),
    parts: z.array(GmailPayloadSchema).optional(),
  }),
);

export const GmailMessageExternalSchema = z
  .object({
    id: z.string(),
    threadId: z.string(),
    labelIds: z.array(z.string()).optional(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    internalDate: z.string().optional(),
    payload: GmailPayloadSchema.optional(),
    sizeEstimate: z.number().optional(),
    raw: z.string().optional(),
  })
  .passthrough();

export const GmailThreadExternalSchema = z
  .object({
    id: z.string(),
    snippet: z.string().optional(),
    historyId: z.string().optional(),
    messages: z.array(GmailMessageExternalSchema).optional(),
  })
  .passthrough();

export const GmailMessageEntityTypeSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  snippet: z.string().nullable(),
  historyId: z.string().nullable(),
  internalDate: z.string().nullable(),
  labelIds: z.array(z.string()).nullable(),
  // Derived/Sanitized fields
  subject: z.string().nullable(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  bodySnippet: z.string().nullable(), // Sanitized text body for RAG
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  __type: z.literal("gmail_message"),
});

export const GmailThreadEntityTypeSchema = z.object({
  id: z.string(),
  snippet: z.string().nullable(),
  historyId: z.string().nullable(),
  messageCount: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  __type: z.literal("gmail_thread"),
});

export type GmailMessageEntityType = z.infer<typeof GmailMessageEntityTypeSchema>;
export type GmailThreadEntityType = z.infer<typeof GmailThreadEntityTypeSchema>;

export type GmailEntityType = GmailMessageEntityType | GmailThreadEntityType;
