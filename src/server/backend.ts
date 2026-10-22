import "server-only";
import { cookies } from "next/headers";
import { S } from "@/lib/strings";
import { SESSION_COOKIE, SESSION_MAX_AGE, serverConfig } from "./config";

// The server side of every API call: it forwards to the real backend with
// the API key and the teacher's token, which stay on the server.

const failure = (message: string, status: number, errors: Record<string, string[]> | null = null) =>
  Response.json({ success: false, message, errors, data: null }, { status });

export async function readToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function writeToken(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearToken() {
  (await cookies()).delete(SESSION_COOKIE);
}

async function callBackend(path: string, request: Request, token: string | undefined): Promise<Response> {
  const headers = new Headers({ Accept: "application/json", "x-api-key": serverConfig.apiKey });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let upstream: Response;
  try {
    upstream = await fetch(`${serverConfig.apiBaseUrl}${path}`, {
      method: "POST",
      headers,
      body: await request.arrayBuffer(),
      cache: "no-store",
    });
  } catch {
    return failure(S.errors.network, 502);
  }
  // Pass the body through untouched: JSON envelopes and file downloads alike.
  const passHeaders = new Headers();
  for (const key of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(key);
    if (value) passHeaders.set(key, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: passHeaders });
}

export async function callApi(path: string, request: Request): Promise<Response> {
  const token = await readToken();
  return callBackend(path, request, token);
}

/** Calls an endpoint from server code (auth routes) and returns the envelope. */
export async function callApiJson<T>(path: string, body: Record<string, unknown> | FormData): Promise<{ ok: boolean; status: number; json: { success: boolean; message: string | null; errors: Record<string, string[]> | null; data: T } }> {
  // A FormData body gets its multipart content type (with boundary) from Request.
  const request =
    body instanceof FormData
      ? new Request("http://internal/", { method: "POST", body })
      : new Request("http://internal/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const response = await callApi(path, request);
  const json = await response.json().catch(() => ({ success: false, message: null, errors: null, data: null }));
  return { ok: response.ok && json.success !== false, status: response.status, json };
}
