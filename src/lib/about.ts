// Splits the dashboard's "about-us" page (plain text) into its parts. Each
// paragraph is "Heading: text"; the values paragraph lists items in
// parentheses, e.g. "مميزاتنا/قيمنا: (السهولة، الأمان، الدقة)".

export type AboutKind = "intro" | "mission" | "vision" | "values" | "other";

export interface AboutPart {
  kind: AboutKind;
  heading: string | null;
  text: string;
  /** The values paragraph's items. */
  items: string[];
}

function kindOf(heading: string | null, index: number): AboutKind {
  if (!heading) return index === 0 ? "intro" : "other";
  if (/مهمت/.test(heading)) return "mission";
  if (/رؤي/.test(heading)) return "vision";
  if (/قيم|مميزات/.test(heading)) return "values";
  if (/من نحن/.test(heading) || index === 0) return "intro";
  return "other";
}

const unquote = (s: string) => s.trim().replace(/^["“«']+|["”»']+$/g, "").trim();

export function parseAbout(content: string): AboutPart[] {
  return content
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraph, i) => {
      // A short heading before the first colon, e.g. "مهمتنا : …".
      const m = /^([^:\n]{1,30}?)\s*:\s*([\s\S]+)$/.exec(paragraph);
      const heading = m ? m[1].trim() : null;
      const text = unquote(m ? m[2] : paragraph);
      const kind = kindOf(heading, i);
      const items =
        kind === "values"
          ? text
              .replace(/^[(（]|[)）]\.?$/g, "")
              .replace(/[).]+$/, "")
              .split(/[،,]/)
              .map((x) => x.trim())
              .filter(Boolean)
          : [];
      return { kind, heading, text, items };
    });
}
