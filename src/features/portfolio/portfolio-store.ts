import { ApiError } from "@/lib/api/client";
import type { Envelope, PortfolioFolder, PortfolioItem, PortfolioPayload } from "@/lib/api/types";
import { S } from "@/lib/strings";

// The portfolio is one JSON document (the app's achievement format), read
// and written whole through /api/portfolio.

export const DEFAULT_FOLDERS: readonly string[] = S.portfolio.defaultFolders;

export const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function emptyPortfolio(teacherId: string): PortfolioPayload {
  return {
    teacher_id: teacherId,
    achievement: {
      title: S.portfolio.defaultTitle,
      folders: DEFAULT_FOLDERS.map((name) => ({ id: newId(), name, subFolders: [], items: [] })),
      daily_report_data: {},
    },
  };
}

async function call<T>(init?: RequestInit): Promise<T> {
  const response = await fetch("/api/portfolio", { credentials: "same-origin", ...init });
  const json = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (response.status === 401 && typeof window !== "undefined") // A full reload on purpose: it drops every cached query of the old session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login?next=/app/portfolio");
  if (!response.ok || !json?.success) throw new ApiError(json?.message || S.errors.generic, response.status);
  return json.data;
}

export const loadPortfolio = () => call<PortfolioPayload | null>();

export const savePortfolio = (payload: PortfolioPayload) =>
  call<null>({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

/** Adds a report as a text item to the first folder (used by report pages). */
export async function addToPortfolio(item: { title: string; content: string }, teacherId = "") {
  const current = (await loadPortfolio()) ?? emptyPortfolio(teacherId);
  const folder = current.achievement.folders[0];
  const entry: PortfolioItem = { type: "text", title: item.title, content: item.content, note_date: new Date().toISOString() };
  folder.items = [...(folder.items ?? []), entry];
  await savePortfolio(current);
}

export function countItems(folder: PortfolioFolder): number {
  return (folder.items?.length ?? 0) + folder.subFolders.reduce((n, f) => n + countItems(f), 0);
}
