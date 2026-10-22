// Public settings, safe to ship to the browser (NEXT_PUBLIC_*).

export const site = {
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  filesBaseUrl: (process.env.NEXT_PUBLIC_FILES_BASE_URL ?? "https://teacher.taseese.org").replace(/\/$/, ""),
  gtmId: process.env.NEXT_PUBLIC_GTM_ID ?? "",
  appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL ?? "",
  playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? "",
} as const;

/** A server file path (`/uploads/...`) as a full URL; full URLs pass through. */
export function fileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${site.filesBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}
