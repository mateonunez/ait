export type Ok<T> = { ok: true; value: T };
export type Err<E extends Error = Error> = { ok: false; error: E };
export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E extends Error>(error: E): Err<E> => ({ ok: false, error });
