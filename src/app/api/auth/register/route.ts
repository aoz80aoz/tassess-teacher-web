import { Endpoints } from "@/lib/api/endpoints";
import type { LoginResponse } from "@/lib/api/types";
import { callApiJson, writeToken } from "@/server/backend";

// The Postman Register fields, forwarded as multipart (the photo is a file).
const FIELDS = ["name", "phone", "gender", "password", "district_id", "nationality_id", "school_id", "img", "school_name", "manager_name"];

export async function POST(request: Request) {
  const body = await request.formData().catch(() => new FormData());
  const payload = new FormData();
  for (const key of FIELDS) {
    const value = body.get(key);
    if (value !== null && value !== "") payload.append(key, value);
  }
  const { ok, status, json } = await callApiJson<LoginResponse>(Endpoints.registerTeacher, payload);
  if (!ok || !json.data?.token) {
    return Response.json({ ...json, data: null }, { status: status >= 400 ? status : 422 });
  }
  await writeToken(json.data.token);
  return Response.json({ success: true, message: json.message, errors: null, data: { teacher: json.data.teacher } });
}
