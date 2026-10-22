"use client";

import { Card } from "@/components/ui/Card";
import { QueryView } from "@/components/ui/States";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { ContentPage } from "@/lib/api/types";

/** A dashboard-managed page (terms, privacy) inside the dashboard. */
export function ContentPageCard({ slug }: { slug: string }) {
  const query = useApiQuery<ContentPage>(Endpoints.pageShow, { slug }, { staleTime: 30 * 60_000 });
  return (
    <Card className="p-7">
      <QueryView query={query}>
        {(page) => (
          <article className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">{page.title}</h2>
            {page.content.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="whitespace-pre-line leading-9 text-ink-2">
                {p}
              </p>
            ))}
          </article>
        )}
      </QueryView>
    </Card>
  );
}
