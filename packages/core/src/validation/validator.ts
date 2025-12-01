import { z } from "zod";
import { AItError } from "../errors/ait-error";
import { type Result, err, ok } from "../types/result";

export type ValidationSchema<T> = z.ZodType<T>;

export function validate<T>(schema: ValidationSchema<T>, data: unknown, context?: string): Result<T, AItError> {
  const result = schema.safeParse(data);

  if (result.success) {
    return ok(result.data);
  }

  return err(
    new AItError("VALIDATION_ERROR", `Validation failed${context ? ` for ${context}` : ""}`, {
      errors: result.error.issues,
      data,
    }),
  );
}

export const zValidators = z;
