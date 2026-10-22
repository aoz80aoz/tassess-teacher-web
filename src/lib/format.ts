// Date, number and money formatting. Latin digits, Arabic month names,
// like the mobile app.

const LOCALE = "ar-u-nu-latn";
const HIJRI = "ar-SA-u-ca-islamic-umalqura-nu-latn";

/** Parses the backend's two date shapes: `2026-09-21 15:26:00` and `2026-09-20 03:26 PM`. */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const ampm = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (ampm) {
    const [, y, m, d, h, min, period] = ampm;
    let hour = Number(h) % 12;
    if (period.toUpperCase() === "PM") hour += 12;
    return new Date(Number(y), Number(m) - 1, Number(d), hour, Number(min));
  }
  const plain = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value.trim());
  if (plain) {
    const [, y, m, d, h = "0", min = "0", s = "0"] = plain;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatDate(value: string | Date | null | undefined, withWeekday = false): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: withWeekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long" }).format(date);
}

export function formatTime(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatHijri(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(HIJRI, { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** An exam's name: its title, else its kind (Taseese exams come without a title). */
export function examTitle(exam: { title: string | null; category: "exam" | "homework" }, labels: { exam: string; homework: string }): string {
  return exam.title?.trim() || labels[exam.category];
}

/** The current Hijri (Umm al-Qura) year, e.g. 1448. */
export function currentHijriYear(): number {
  const year = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { year: "numeric" }).formatToParts(new Date()).find((p) => p.type === "year")?.value;
  return Number(year) || 1448;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** `2026-10-22 09:30:00`, the format the backend expects in requests. */
export function toRequestDateTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:00`;
}

/** Value for `<input type="datetime-local">`. */
export function toDateTimeInput(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return "";
  return toRequestDateTime(date).slice(0, 16).replace(" ", "T");
}

export function fromDateTimeInput(value: string): Date | null {
  return value ? parseApiDate(value.replace("T", " ")) : null;
}

/** 72.5 → "73%"; values are clamped to 0–100. */
export function percent(value: number | string | null | undefined): string {
  const n = Math.max(0, Math.min(100, Number(value) || 0));
  return `${Math.round(n)}%`;
}

export function clampPercent(value: number | string | null | undefined): number {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

/** Money is shown exactly as the backend sends it (like MoneyAmount in the app). */
export function money(value: string | number): string {
  return String(value);
}

export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Arabic ordinal-free "حصة 3" style counters use Latin digits too. */
export function count(n: number): string {
  return new Intl.NumberFormat(LOCALE).format(n);
}
