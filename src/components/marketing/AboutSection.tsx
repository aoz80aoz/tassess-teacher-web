import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { parseAbout, type AboutKind } from "@/lib/about";
import type { ContentPage } from "@/lib/api/types";
import { S } from "@/lib/strings";

const M = S.marketing;
const CARD_ICON: Partial<Record<AboutKind, IconName>> = { mission: "trend", vision: "bulb", other: "star" };
const MARK = "url(/brand/hessati-mark.png)";

/** The dashboard's "about-us" page as a section: intro, mission / vision cards and values. */
export function AboutSection({ page, full = false }: { page: ContentPage; full?: boolean }) {
  const parts = parseAbout(page.content);
  const intro = parts.find((p) => p.kind === "intro");
  const cards = parts.filter((p) => p.kind === "mission" || p.kind === "vision" || p.kind === "other");
  const values = parts.find((p) => p.kind === "values");
  const Title = full ? "h1" : "h2";

  return (
    <div className="grid overflow-hidden rounded-[28px] border border-line bg-white lg:grid-cols-[1.05fr_1fr]">
      <div className="relative flex flex-col justify-center gap-5 overflow-hidden bg-primary p-8 text-white sm:p-12">
        {/* The Hessati mark as a soft watermark. */}
        <span
          className="pointer-events-none absolute -bottom-10 -end-10 block size-64 bg-white/10"
          style={{ maskImage: MARK, WebkitMaskImage: MARK, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }}
          aria-hidden="true"
        />
        <span className="relative font-semibold text-accent-200">{M.aboutEyebrow}</span>
        <Title className="relative text-3xl font-bold leading-snug sm:text-4xl">{page.title}</Title>
        {intro && <p className="relative max-w-xl text-lg leading-9 text-primary-200 sm:text-xl">{intro.text}</p>}
        <div className="relative flex flex-wrap gap-3 pt-2">
          <ButtonLink href="/register" variant="accent">
            {M.startNow}
          </ButtonLink>
          {!full && (
            <ButtonLink href="/about" variant="onDark">
              {M.aboutMore}
            </ButtonLink>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 sm:p-10">
        {cards.map((c) => (
          <article key={c.heading ?? c.text} className="flex items-start gap-4 rounded-2xl border border-soft bg-surface p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Icon name={CARD_ICON[c.kind] ?? "star"} className="size-6" />
            </span>
            <div className="flex flex-col gap-1.5">
              {c.heading && <h3 className="text-lg font-semibold">{c.heading}</h3>}
              <p className="leading-8 text-ink-2">{c.text}</p>
            </div>
          </article>
        ))}
        {values && values.items.length > 0 && (
          <div className="flex flex-col gap-3 pt-1">
            {values.heading && <h3 className="text-lg font-semibold">{values.heading}</h3>}
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {values.items.map((v) => (
                <li key={v} className="flex flex-col items-center gap-2 rounded-2xl bg-accent-soft px-3 py-4 text-center font-semibold text-accent-ink">
                  <span className="grid size-9 place-items-center rounded-full bg-white text-accent">
                    <Icon name="check" className="size-5" strokeWidth={2.2} />
                  </span>
                  {v}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
