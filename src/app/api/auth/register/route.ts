import { Endpoints } from "@/lib/api/endpoints";
import type { LoginResponse } from "@/lib/api/types";
import { callApiJson, writeToken } from "@/server/backend";

const FIELDS = ["name", "phone", "gender", "password", "nationality_id", "district_id", "school_id", "school_name", "manager_name"];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const payload: Record<string, unknown> = { fcm_token: null };
  for (const key of FIELDS) if (body[key] !== undefined && body[key] !== "") payload[key] = body[key];
  const { ok, status, json } = await callApiJson<LoginResponse>(Endpoints.registerTeacher, payload);
  if (!ok || !json.data?.token) {
    return Response.json({ ...json, data: null }, { status: status >= 400 ? status : 422 });
  }
  await writeToken(json.data.token);
  return Response.json({ success: true, message: json.message, errors: null, data: { teacher: json.data.teacher } });
}
