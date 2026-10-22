"use client";

import clsx from "clsx";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { track } from "@/lib/analytics";
import { money } from "@/lib/format";
import { S } from "@/lib/strings";
import type { FrontCatalog } from "@/server/public-api";

const SUB = S.subscriptions;

/** Real plans and prices from the public catalog: stage → grade → subjects. */
export function PricingCatalog({ catalog }: { catalog: FrontCatalog }) {
  const [stageId, setStageId] = useState(catalog.stages[0].id);
  const stage = catalog.stages.find((s) => s.id === stageId) ?? catalog.stages[0];
  const [gradeId, setGradeId] = useState(stage.grades[0]?.id);
  const grade = stage.grades.find((g) => g.id === gradeId) ?? stage.grades[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <div role="tablist" aria-label={SUB.stage} className="flex flex-wrap gap-1 rounded-xl bg-soft p-1">
          {catalog.stages.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === stage.id}
              onClick={() => {
                setStageId(s.id);
                setGradeId(s.grades[0]?.id);
              }}
              className={clsx("min-h-10 rounded-[9px] px-4 text-sm", s.id === stage.id ? "bg-primary font-semibold text-white" : "text-ink-2 hover:text-ink")}
            >
              {s.name}
            </button>
          ))}
        </div>
        <Select wrapperClassName="min-w-56" label={SUB.grade} value={grade?.id ?? ""} onChange={(e) => setGradeId(Number(e.target.value))}>
          {stage.grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {(grade?.subjects ?? []).map((subject) => (
          <article key={subject.id} className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-6">
            <h3 className="text-lg font-semibold">{subject.name}</h3>
            <ul className="flex flex-col gap-2">
              {subject.plans.map((p) => (
                <li key={p.months} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
                  <span className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-sm text-muted">{SUB.month(p.months)}</span>
                  </span>
                  <strong className="text-lg text-primary">{SUB.priceValue(money(p.price))}</strong>
                </li>
              ))}
            </ul>
            <ButtonLink href="/register" variant="outline" className="mt-auto" onClick={() => track("cta_click", { location: "pricing", item_id: String(subject.id) })}>
              {S.marketing.pricingSubscribe}
            </ButtonLink>
          </article>
        ))}
      </div>
    </div>
  );
}
