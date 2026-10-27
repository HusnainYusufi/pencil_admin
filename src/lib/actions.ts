import "server-only";
import { ApiError } from "./api";

/** Result every Server Action returns to its form (useActionState). */
export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialActionState: ActionState = {};

const FRIENDLY: Record<string, string> = {
  PERMISSION_DENIED: "Your role does not allow this action.",
  RATE_LIMITED: "Too many requests. Wait a moment and try again.",
  SERVICE_UNAVAILABLE: "The Pencil API is unreachable. Try again shortly.",
  IDEMPOTENCY_IN_PROGRESS: "This request is already being processed.",
};

/** Maps an API failure (incl. field-level validation errors) into form state. */
export function toActionError(error: unknown): ActionState {
  if (!(error instanceof ApiError)) throw error; // redirects & unexpected errors propagate
  const fieldErrors: Record<string, string> = {};
  if (Array.isArray(error.details)) {
    for (const item of error.details as Array<{ field?: string; errors?: string[] }>) {
      if (item.field && item.errors?.[0]) fieldErrors[item.field] = item.errors[0];
    }
  }
  const reference = error.requestId ? ` (ref ${error.requestId.slice(0, 8)})` : "";
  return {
    ok: false,
    error: (FRIENDLY[error.code] ?? error.message) + (error.status >= 500 ? reference : ""),
    fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
  };
}

export const str = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export const optional = (form: FormData, key: string) => str(form, key) || undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function assertUuid(value: string): string {
  if (!UUID.test(value)) throw new ApiError(400, "BAD_REQUEST", "Invalid identifier");
  return value;
}
