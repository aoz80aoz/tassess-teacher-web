"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState, ErrorState, PageSkeleton, QueryView } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useSubscriptions } from "@/features/shell/use-teacher";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { AcademicCalendar } from "@/lib/api/types";
import { currentHijriYear, formatDate, formatHijri, percent } from "@/lib/format";
import { S } from "@/lib/strings";

export default function CalendarPage() {
  const subs = useSubscriptions();
  const list = subs.data?.subscriptions ?? [];
  const [categoryPicked, setCategoryPicked] = useState<number | null>(null);
  const categoryId = categoryPicked ?? list[0]?.subject_category_id;
  // Postman: the calendar summary is per specialty (category_id).
  const query = useApiQuery<AcademicCalendar>(Endpoints.academicCalendar, { category_id: categoryId }, { enabled: Boolean(categoryId) });
  const [picked, setPicked] = useState<string | null>(null);

  if (subs.isPending) return <PageSkeleton />;
  if (subs.error) return <ErrorState error={subs.error} onRetry={() => subs.refetch()} />;
  if (!list.length) return <EmptyState icon="calendar" title={S.home.noSpecialties} action={<ButtonLink href="/app/subscriptions">{S.nav.subscribeNow}</ButtonLink>} />;

  const specialty = (
    <Select
      label={S.calendar.specialty}
      wrapperClassName="min-w-56"
      value={categoryId ?? ""}
      onChange={(e) => {
        setCategoryPicked(Number(e.target.value));
        setPicked(null);
      }}
    >
      {list.map((s) => (
        <option key={s.id} value={s.subject_category_id}>
          {s.subject_category.name}
        </option>
      ))}
    </Select>
  );

  return (
    <QueryView query={query}>
      {(data) => {
        const keys = Object.keys(data.cards);
        const current = picked ?? keys.find((k) => data.cards[k].is_current) ?? keys[0];
        const term = data.cards[current];
        const events = data.events[current] ?? [];
        return (
          <>
            <PageHeader title={S.calendar.title} subtitle={S.calendar.hijriYear(data.hijri_year ?? currentHijriYear())} actions={specialty} />
            <Tabs
              label={S.calendar.title}
              items={keys.map((k, i) => ({ key: k, label: S.calendar.term(i + 1) }))}
              value={current}
              onChange={setPicked}
              className="self-start"
            />
            {term && (
              <Card className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">{S.calendar.term(keys.indexOf(current) + 1)}</h2>
                  {term.is_current && <Chip tone="success">{S.calendar.current}</Chip>}
                </div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <span>
                    <span className="text-muted">{S.calendar.from} </span>
                    {formatDate(term.start_date)} <span className="text-muted">({formatHijri(term.start_date)})</span>
                  </span>
                  <span>
                    <span className="text-muted">{S.calendar.to} </span>
                    {formatDate(term.end_date)} <span className="text-muted">({formatHijri(term.end_date)})</span>
                  </span>
                </div>
                <div className="text-muted">{S.home.weekOf(term.current_week, term.total_weeks)}</div>
                <ProgressBar value={term.progress_percentage} color="var(--color-accent)" height={10} label={S.home.termProgress} />
                <div className="text-sm font-semibold">{percent(term.progress_percentage)}</div>
              </Card>
            )}
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">{S.calendar.events}</h2>
              {events.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line-2 bg-white p-8 text-center text-muted">{S.calendar.noEvents}</p>
              ) : (
                events.map((e) => (
                  <Card key={e.id} className="flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-[1_1_240px]">
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-sm text-muted">
                        {formatDate(e.date, true)} · {S.calendar.week(e.week_label)}
                      </div>
                    </div>
                    <span className="rounded-full px-3 py-1 text-[13px] font-medium" style={{ background: e.type_bg_color, color: e.type_text_color }}>
                      {e.type_name}
                    </span>
                  </Card>
                ))
              )}
            </section>
          </>
        );
      }}
    </QueryView>
  );
}
