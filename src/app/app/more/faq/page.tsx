"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ListSkeleton, QueryView } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { Faq, FaqCategory } from "@/lib/api/types";
import { S } from "@/lib/strings";

export default function FaqPage() {
  const categories = useApiQuery<FaqCategory[]>(Endpoints.faqCategories, undefined, { staleTime: 10 * 60_000 });
  const [picked, setPicked] = useState<string | null>(null);
  const current = picked ?? String(categories.data?.[0]?.id ?? "");
  const faqs = useApiQuery<Faq[]>(Endpoints.faqsByCategory, { category_id: Number(current) }, { enabled: Boolean(current) });
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{S.more.faq}</h2>
      <QueryView query={categories} loading={<ListSkeleton rows={3} />}>
        {(list) => (
          <>
            <Tabs label={S.more.faq} value={current} onChange={setPicked} items={list.map((c) => ({ key: String(c.id), label: c.name }))} className="self-start" />
            {faqs.isPending ? (
              <ListSkeleton rows={3} />
            ) : (faqs.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-muted">{S.more.noFaqs}</p>
            ) : (
              faqs.data!.map((f) => (
                <details key={f.id} className="rounded-2xl border border-line px-5 py-4">
                  <summary className="cursor-pointer font-semibold">{f.question}</summary>
                  <p className="mt-2.5 leading-8 text-muted">{f.answer}</p>
                </details>
              ))
            )}
          </>
        )}
      </QueryView>
    </Card>
  );
}
