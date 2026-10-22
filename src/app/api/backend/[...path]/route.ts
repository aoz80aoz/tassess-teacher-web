import type { NextRequest } from "next/server";
import { Endpoints } from "@/lib/api/endpoints";
import { callApi } from "@/server/backend";

// Same-origin proxy for every backend call (see src/server/backend.ts).
// Login and register go through /api/auth so the token is put in an
// httpOnly cookie and never returned to the browser.

const TOKEN_ENDPOINTS = new Set<string>([Endpoints.login, Endpoints.registerTeacher]);

export async function POST(request: NextRequest, ctx: RouteContext<"/api/backend/[...path]">) {
  const { path } = await ctx.params;
  const endpoint = `/${path.join("/")}`;
  if (TOKEN_ENDPOINTS.has(endpoint)) {
    return Response.json({ success: false, message: "Use /api/auth", errors: null, data: null }, { status: 404 });
  }
  return callApi(endpoint, request);
}
