import "server-only";
import { Endpoints } from "@/lib/api/endpoints";
import type { CatalogCategory, ContentPage, Named, SocialMedia } from "@/lib/api/types";
import { serverConfig } from "./config";

// Public content for the marketing pages, fetched at build/revalidate time
// without any visitor cookie, so those pages stay static (good for SEO).

async function publicCall<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
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

/** Contact links for the public footer (GET /front/social_media, no key). */
export const getFrontSocialMedia = () => frontGet<SocialMedia>(Endpoints.frontSocialMedia);

// ---- Public catalog: the Postman "Front (no auth)" GET endpoints ----

async function frontGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${serverConfig.apiBaseUrl}${path}`, { headers: { Accept: "application/json" }, next: { revalidate: 3600 } });
    const json = (await response.json()) as { success: boolean; data: T };
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export interface FrontCatalog {
  stages: (Named & { grades: (Named & { subjects: CatalogCategory[] })[] })[];
}

/** Stages → grades → subjects with their plans and prices, for the pricing section. */
export async function getFrontCatalog(): Promise<FrontCatalog | null> {
  const call = <T,>(path: string, id?: number) => frontGet<T>(id === undefined ? path : `${path}/${id}`);
  const stages = await call<Named[]>(Endpoints.frontStages);
  if (!stages) return null;
  const withGrades = await Promise.all(
    stages.map(async (stage) => {
      const grades = (await call<Named[]>(Endpoints.frontClassrooms, stage.id)) ?? [];
      const filled = await Promise.all(grades.map(async (g) => ({ id: g.id, name: g.name, subjects: (await call<CatalogCategory[]>(Endpoints.frontSubjects, g.id)) ?? [] })));
      return { id: stage.id, name: stage.name, grades: filled.filter((g) => g.subjects.length > 0) };
    }),
  );
  const result = withGrades.filter((s) => s.grades.length > 0);
  return result.length ? { stages: result } : null;
}
