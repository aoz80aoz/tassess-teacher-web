import type { Envelope } from "./types";
import { S } from "@/lib/strings";

// Browser-side API client. Every call goes to our own /api/backend proxy,
// which adds the API key and the teacher's token on the server.

export type ApiBody = Record<string, unknown> | FormData | undefined;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: Record<string, string[]> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The first field error, else the message. */
  get displayMessage(): string {
    const first = this.errors ? Object.values(this.errors).flat()[0] : undefined;
    return first ?? this.message;
  }
}

function request(path: string, body: ApiBody): Promise<Response> {
  const isForm = body instanceof FormData;
  return fetch(`/api/backend${path}`, {
    method: "POST",
    headers: isForm ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body ?? {}),
    credentials: "same-origin",
  });
}

function onUnauthorized() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/app")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // A full reload on purpose: it drops every cached query of the old session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${next}`);
  }
}

/** POSTs to the backend and returns the envelope's `data`. Throws ApiError. */
export async function api<T>(path: string, body?: ApiBody): Promise<T> {
  let response: Response;
  try {
    response = await request(path, body);
  } catch {
    throw new ApiError(S.errors.network, 0);
  }
  let json: Partial<Envelope<T>> | null = null;
  try {
    json = (await response.json()) as Partial<Envelope<T>>;
  } catch {
    // Not JSON (gateway error page, empty body…).
  }
  if (response.status === 401) {
    onUnauthorized();
    throw new ApiError(json?.message ?? S.errors.sessionExpired, 401);
  }
  if (!response.ok || !json || json.success === false) {
    throw new ApiError(json?.message || S.errors.generic, response.status, json?.errors ?? null);
  }
  return json.data as T;
}

/** POSTs and returns the response as a file (exports, invoices). */
export async function apiFile(path: string, body?: ApiBody): Promise<Blob> {
  const response = await request(path, body);
  if (response.status === 401) onUnauthorized();
  if (!response.ok) {
    let message: string = S.errors.generic;
    try {
      message = ((await response.json()) as Envelope<unknown>).message ?? message;
    } catch {}
    throw new ApiError(message, response.status);
  }
  return response.blob();
}

/** Builds multipart form data the way Laravel reads it (`key[0][field]`). */
export function toFormData(fields: Record<string, unknown>): FormData {
  const form = new FormData();
  const append = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (value instanceof Blob) form.append(key, value);
    else if (Array.isArray(value)) value.forEach((v, i) => append(`${key}[${i}]`, v));
    else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) append(`${key}[${k}]`, v);
    } else if (typeof value === "boolean") form.append(key, value ? "1" : "0");
    else form.append(key, String(value));
  };
  for (const [key, value] of Object.entries(fields)) append(key, value);
  return form;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.displayMessage;
  return S.errors.generic;
}
