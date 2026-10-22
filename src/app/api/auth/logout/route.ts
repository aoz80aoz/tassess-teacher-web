import { Endpoints } from "@/lib/api/endpoints";
import { callApiJson, clearToken } from "@/server/backend";

export async function POST() {
  // The cookie goes whatever the backend answers: a failed call must not
  // leave the teacher signed in on this browser.
  await callApiJson(Endpoints.logout, {}).catch(() => null);
  await clearToken();
  return Response.json({ success: true, message: null, errors: null, data: null });
}
