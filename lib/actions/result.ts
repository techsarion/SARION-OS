// Shared Server Action result contract — mirrors the S app's `ActionResult`
// pattern so every action returns a typed, discriminated outcome the UI can
// react to (toast on failure, render per-field errors, redirect on success).
//
//   const res = await createTask(form);
//   if (!res.ok) { toast.error(res.error); return; }
//   toast.success("Task created");

export type ActionOk<T> = { ok: true } & T;
export type ActionErr = {
  ok: false;
  error: string;
  /** Zod field errors, keyed by field name — render inline under inputs. */
  fieldErrors?: Record<string, string[]>;
  /** Optional machine-readable code (e.g. "forbidden", "not_found"). */
  code?: string;
};
export type ActionResult<T = Record<string, never>> = ActionOk<T> | ActionErr;

/** Success helper. `ok()` for void, `ok({ id })` to return data. */
export function ok(): ActionResult;
export function ok<T extends Record<string, unknown>>(data: T): ActionResult<T>;
export function ok<T extends Record<string, unknown>>(data?: T): ActionResult<T> {
  return { ok: true, ...(data ?? ({} as T)) };
}

/** Failure helper. */
export function fail(
  error: string,
  extra?: { fieldErrors?: Record<string, string[]>; code?: string },
): ActionErr {
  return { ok: false, error, ...extra };
}

/** Map a thrown error into a friendly, never-leaky failure result. */
export function failFrom(err: unknown, fallback = "Something went wrong. Please try again."): ActionErr {
  if (err instanceof Error && err.message) return fail(err.message);
  return fail(fallback);
}
