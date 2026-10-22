import { ApiError } from "@/lib/api/client";
import type { Envelope, Teacher } from "@/lib/api/types";
import { S } from "@/lib/strings";

// Login and register go to our own /api/auth routes, which keep the token
// in an httpOnly cookie.

export async function authPost(path: "login" | "register" | "logout", body: Record<string, unknown> | FormData = {}): Promise<{ teacher: Teacher } | null> {
  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: isForm ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" },
      body: isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(S.errors.network, 0);
  }
  const json = (await response.json().catch(() => null)) as Envelope<{ teacher: Teacher } | null> | null;
  if (!response.ok || !json?.success) throw new ApiError(json?.message || S.errors.generic, response.status, json?.errors ?? null);
  return json.data;
}

/** Only same-site paths, so `?next=` can't send the teacher elsewhere. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/app") ? next : "/app";
}
