import type { ContentPage } from "@/lib/api/types";
import { S } from "@/lib/strings";

/** A dashboard-managed text page (terms, privacy): plain text with blank-line paragraphs. */
export function ContentPageView({ page, fallbackTitle }: { page: ContentPage | null; fallbackTitle: string }) {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-bold">{page?.title ?? fallbackTitle}</h1>
      {page ? (
        page.content
          .split(/\n{2,}/)
          .map((p, i) => (
            <p key={i} className="whitespace-pre-line text-[17px] leading-9 text-ink-2">
              {p}
            </p>
          ))
      ) : (
        <p className="text-muted">{S.errors.pageError}</p>
      )}
    </article>
  );
}
