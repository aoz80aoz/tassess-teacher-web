import { Endpoints } from "@/lib/api/endpoints";
import type { LoginResponse } from "@/lib/api/types";
import { callApiJson, writeToken } from "@/server/backend";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { ok, status, json } = await callApiJson<LoginResponse>(Endpoints.login, {
    phone: body.phone,
    password: body.password,
    fcm_token: null,
  });
  if (!ok || !json.data?.token) {
    return Response.json({ ...json, data: null }, { status: status >= 400 ? status : 401 });
  }
  await writeToken(json.data.token);
  return Response.json({ success: true, message: json.message, errors: null, data: { teacher: json.data.teacher } });
}
