import "server-only";
import { Endpoints } from "@/lib/api/endpoints";
import type { ContentPage, SocialMedia } from "@/lib/api/types";
import { serverConfig } from "./config";
import { runMock } from "./mocks/handlers";

// Public content for the marketing pages, fetched at build/revalidate time
// without any visitor cookie, so those pages stay static (good for SEO).

async function publicCall<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  if (serverConfig.useMocks) {
    try {
      return runMock(path, body, {}) as T;
    } catch {
      return null;
    }
  }
  try {
    const response = await fetch(`${serverConfig.apiBaseUrl}${path}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "x-api-key": serverConfig.apiKey },
      body: JSON.stringify(body),
      next: { revalidate: 3600 },
    });
    const json = (await response.json()) as { success: boolean; data: T };
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export const getContentPage = (slug: string) => publicCall<ContentPage>(Endpoints.pageShow, { slug });
export const getSocialMedia = () => publicCall<SocialMedia>(Endpoints.socialMedia, {});
