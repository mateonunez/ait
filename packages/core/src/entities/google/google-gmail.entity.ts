import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import type { GmailMessageExternal } from "../../types/integrations";

export class GmailMessageEntity {
  @Expose()
  id!: string;

  @Expose()
  threadId!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  snippet!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  historyId!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  internalDate!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  labelIds!: string[] | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  subject!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  from!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  to!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  bodySnippet!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  metadata!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "gmail_message" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): GmailMessageEntity {
    return plainToInstance(GmailMessageEntity, data, { excludeExtraneousValues: true });
  }
}

function getHeader(headers: Array<{ name: string; value: string }> | undefined, name: string): string | null {
  if (!headers) return null;
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : null;
}

function extractBodySnippet(payload: GmailMessageExternal["payload"]): string | null {
  if (!payload) return null;

  // 1. Try simple text/plain on root
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  // 2. Recursive search for text/plain
  // Helper to find first text/plain body in parts
  const findBody = (parts: NonNullable<GmailMessageExternal["payload"]>["parts"]): string | null => {
    if (!parts) return null;

    for (const part of parts) {
      if (!part) continue;
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
      if (part.parts) {
        const found = findBody(part.parts);
        if (found) return found;
      }
    }
    return null;
  };

  const body = payload.parts ? findBody(payload.parts) : null;

  return body ? body.substring(0, 1000) : null;
}

export function mapGmailMessage(external: GmailMessageExternal): GmailMessageEntity {
  const headers = external.payload?.headers;

  const mapped = {
    id: external.id,
    threadId: external.threadId,
    snippet: external.snippet ?? null,
    historyId: external.historyId ?? null,
    internalDate: external.internalDate ?? null,
    labelIds: external.labelIds ?? null,
    subject: getHeader(headers, "subject"),
    from: getHeader(headers, "from"),
    to: getHeader(headers, "to"),
    bodySnippet: extractBodySnippet(external.payload),
    metadata: {
      sizeEstimate: external.sizeEstimate,
    },
    createdAt: external.internalDate ? new Date(Number.parseInt(external.internalDate, 10)) : new Date(),
  };

  return plainToInstance(GmailMessageEntity, mapped, {
    excludeExtraneousValues: true,
    exposeDefaultValues: true,
  });
}
