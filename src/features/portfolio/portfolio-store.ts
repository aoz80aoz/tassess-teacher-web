import { ApiError } from "@/lib/api/client";
import type { DailyReportData, DailyReportField, Envelope, PortfolioFolder, PortfolioItem, PortfolioPayload, Teacher } from "@/lib/api/types";
import { S } from "@/lib/strings";

// The portfolio is one JSON document (the app's achievement format), read
// and written whole through /api/portfolio.

export const DEFAULT_FOLDERS: readonly string[] = S.portfolio.defaultFolders;

export const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const REPORT_FIELDS: DailyReportField[] = [
  "subject_execution_status",
  "lesson_goals_achievement",
  "average_participation",
  "average_comprehension",
  "educational_tools",
  "teaching_method",
  "immediate_interventions",
  "difficulties_and_challenges",
  "general_notes",
];

/** Reads daily_report_data in the app's shape; anything else (older web files, missing parts) gives empty fields. */
export function readDailyReport(raw: unknown): { fields: Record<DailyReportField, string>; principal: string } {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rf = obj.report_fields && typeof obj.report_fields === "object" ? (obj.report_fields as Record<string, unknown>) : {};
  const sig = obj.signatures && typeof obj.signatures === "object" ? (obj.signatures as Record<string, unknown>) : {};
  const text = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) ? v.join(S.portfolio.listSeparator) : "");
  return {
    fields: Object.fromEntries(REPORT_FIELDS.map((k) => [k, text(rf[k])])) as Record<DailyReportField, string>,
    principal: text(sig.principal_name),
  };
}

/** Builds daily_report_data exactly like the app, with the school and teacher from the account. */
export function buildDailyReport(teacher: Teacher | undefined, fields: Record<DailyReportField, string>, principal: string): DailyReportData {
  const region = teacher?.school?.region?.name ?? "";
  return {
    report_title: S.portfolio.dailyReportTitle,
    school_info: { ministry: S.portfolio.ministry, school_name: teacher?.school?.name ?? "", region_name: region, region: { name: region } },
    report_fields: fields,
    signatures: { teacher_name: teacher?.name ?? "", principal_name: principal },
  };
}

export function emptyPortfolio(teacherId: string): PortfolioPayload {
  return {
    teacher_id: teacherId,
    achievement: {
      title: S.portfolio.defaultTitle,
      folders: DEFAULT_FOLDERS.map((name) => ({ id: newId(), name, subFolders: [], items: [] })),
      daily_report_data: buildDailyReport(undefined, readDailyReport(null).fields, ""),
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
