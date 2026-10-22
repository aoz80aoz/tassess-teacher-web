import "server-only";

// Server-only settings. The API key and the teacher's token never reach
// the browser: every backend call goes through /api/backend.

export const serverConfig = {
  useMocks: (process.env.USE_MOCK_API ?? "true") !== "false",
  apiBaseUrl: (process.env.API_BASE_URL ?? "https://teacher.taseese.org/api").replace(/\/$/, ""),
  apiKey: process.env.API_KEY ?? "",
} as const;

export const SESSION_COOKIE = "tt_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
