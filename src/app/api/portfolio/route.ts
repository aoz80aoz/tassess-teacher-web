import { Endpoints } from "@/lib/api/endpoints";
import type { PortfolioPayload } from "@/lib/api/types";
import { callApiJson, readToken } from "@/server/backend";
import { serverConfig } from "@/server/config";
import { S } from "@/lib/strings";
import { getPortfolio, isMockAuthorized, setPortfolio } from "@/server/mocks/handlers";

// The portfolio is one JSON file on the server (same format as the app).
// Reading it means fetching a storage URL, and saving it means a multipart
// upload, so both happen here instead of in the browser.

const ok = (data: unknown) => Response.json({ success: true, message: null, errors: null, data });
const fail = (message: string, status: number) => Response.json({ success: false, message, errors: null, data: null }, { status });

export async function GET() {
  if (serverConfig.useMocks) {
    if (!isMockAuthorized(await readToken())) return fail("Unauthenticated.", 401);
    return ok(getPortfolio());
  }
  const { ok: found, status, json } = await callApiJson<{ file_portfolio: string | null }>(Endpoints.getPortfolioJsonFile, {});
  if (status === 401) return fail("Unauthenticated.", 401);
  const url = found ? json.data?.file_portfolio : null;
  if (!url) return ok(null);
  try {
    const file = await fetch(url, { cache: "no-store" });
    const payload = (await file.json()) as unknown;
    const unwrapped = payload && typeof payload === "object" && "data" in payload ? (payload as { data: unknown }).data : payload;
    return ok(unwrapped as PortfolioPayload);
  } catch {
    return fail(S.portfolio.readFailed, 502);
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as PortfolioPayload | null;
  if (!payload?.achievement) return fail(S.portfolio.invalidFormat, 422);
  const token = await readToken();
  if (serverConfig.useMocks) {
    if (!isMockAuthorized(token)) return fail("Unauthenticated.", 401);
    setPortfolio(payload);
    return ok(null);
  }
  const form = new FormData();
  form.append("file", new Blob([JSON.stringify(payload)], { type: "application/json" }), `achievement_${Date.now()}.json`);
  const upstream = await fetch(`${serverConfig.apiBaseUrl}${Endpoints.uploadPortfolioJsonFile}`, {
    method: "POST",
    headers: { Accept: "application/json", "x-api-key": serverConfig.apiKey, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  return new Response(upstream.body, { status: upstream.status, headers: { "content-type": "application/json" } });
}
