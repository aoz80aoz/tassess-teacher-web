"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, Chip } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState, QueryView } from "@/components/ui/States";
import { SessionStatusChip } from "@/features/common/SessionStatusChip";
import { useHome, useTeacher } from "@/features/shell/use-teacher";
import { formatDate, formatTime, parseApiDate, percent } from "@/lib/format";
import type { HomeData, TodaySession } from "@/lib/api/types";
import { S } from "@/lib/strings";

function minutesUntil(s: TodaySession) {
  const start = parseApiDate(s.starts_at);
  return start ? Math.round((start.getTime() - Date.now()) / 60_000) : null;
}

function relative(minutes: number) {
  if (minutes <= 0) return "";
  if (minutes < 60) return S.home.inMinutes(minutes);
  return S.home.inHours(Math.floor(minutes / 60));
}

function NextSessionBanner({ sessions }: { sessions: TodaySession[] }) {
  const next = sessions.find((s) => s.status !== "completed");
  if (!next) {
    return (
      <section className="flex min-h-56 flex-[2_1_480px] flex-col justify-center gap-3 rounded-[20px] bg-primary p-8 text-white">
        <h2 className="text-[26px] font-bold">{S.home.noUpcoming}</h2>
        <p className="text-primary-200">{S.home.noUpcomingBody}</p>
        <div>
          <ButtonLink href="/app/specialties" variant="onDark">
            {S.nav.specialties}
          </ButtonLink>
        </div>
      </section>
    );
  }
  const minutes = minutesUntil(next) ?? 0;
  return (
    <section className="flex min-h-56 flex-[2_1_480px] flex-col justify-center gap-4 rounded-[20px] bg-primary p-8 text-white">
      <Chip className="self-start !bg-white/15 !text-white">{minutes > 0 ? S.home.nextSessionIn(relative(minutes)) : S.status[next.status]}</Chip>
      <h2 className="text-[26px] font-bold leading-snug">
        {next.lesson_name ?? next.name} · {next.group.name}
      </h2>
      <p className="text-[15px] text-primary-200">
        {next.name} · {formatTime(next.starts_at)} · {next.is_prepared ? S.home.prepared : S.home.notPrepared}
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`/app/sessions/${next.id}/run`} variant="accent" icon="play">
          {S.home.startSession}
        </ButtonLink>
        <ButtonLink href={`/app/sessions/${next.id}/preparation`} variant="onDark">
          {S.home.reviewPrep}
        </ButtonLink>
      </div>
    </section>
  );
}

function Stats({ data }: { data: HomeData }) {
  const classrooms = data.subscriptions.reduce((n, s) => n + (s.groups_count ?? 0), 0);
  const students = data.subscriptions.reduce((n, s) => n + (s.students_count ?? 0), 0);
  const items: { value: number; label: string; icon: IconName }[] = [
    { value: classrooms, label: S.home.statClassrooms, icon: "monitor" },
    { value: students, label: S.home.statStudents, icon: "users" },
    { value: data.today_sessions.length, label: S.home.statToday, icon: "calendar" },
    { value: data.subscriptions.filter((s) => s.is_valid).length, label: S.home.statSubscriptions, icon: "layers" },
  ];
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
      {items.map((s) => (
        <Card key={s.label} className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Icon name={s.icon} className="size-6" />
          </span>
          <div>
            <div className="text-[26px] font-bold">{s.value}</div>
            <div className="text-sm text-muted">{s.label}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

const FEATURES: { title: string; body: string; icon: IconName }[] = [
  { title: S.home.featureKagan, body: S.home.featureKaganBody, icon: "clock" },
  { title: S.home.featureWheel, body: S.home.featureWheelBody, icon: "wheel" },
  { title: S.home.featureTaseese, body: S.home.featureTaseeseBody, icon: "doc" },
  { title: S.home.featurePortfolio, body: S.home.featurePortfolioBody, icon: "folder" },
];

export default function HomePage() {
  const home = useHome();
  const teacher = useTeacher();
  return (
    <QueryView query={home}>
      {(data) => (
        <>
          <header>
            <div className="text-sm text-muted">{formatDate(new Date(), true)}</div>
            <h1 className="text-[28px] font-bold">{S.home.greeting(teacher.data?.name ?? "")}</h1>
          </header>

          <div className="flex flex-wrap gap-6">
            <NextSessionBanner sessions={data.today_sessions} />
            {data.academic_calendar && (
              <Link href="/app/calendar" className="flex flex-[1_1_280px] flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 hover:border-primary">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{S.home.calendar}</h2>
                  <Chip>{S.home.hijriYear(data.academic_calendar.hijri_year)}</Chip>
                </div>
                <div className="text-[22px] font-bold">{data.academic_calendar.term_label}</div>
                <div className="text-sm text-muted">{S.home.weekOf(data.academic_calendar.current_week, data.academic_calendar.total_weeks)}</div>
                <ProgressBar value={data.academic_calendar.progress_percentage} color="var(--color-accent)" height={10} label={S.home.termProgress} />
                <div className="flex justify-between text-sm text-muted">
                  <span>{S.home.termProgress}</span>
                  <span className="font-semibold text-ink">{percent(data.academic_calendar.progress_percentage)}</span>
                </div>
              </Link>
            )}
          </div>

          <Stats data={data} />

          <div className="flex flex-wrap items-start gap-6">
            <Card className="flex flex-[2_1_480px] flex-col gap-4">
              <CardHeader title={S.home.todaySessions} />
              {data.today_sessions.length === 0 ? (
                <p className="py-6 text-center text-muted">{S.home.noTodaySessions}</p>
              ) : (
                data.today_sessions.map((s) => (
                  <Link key={s.id} href={`/app/sessions/${s.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-soft bg-surface p-3.5 hover:border-primary">
                    <div className="w-20 shrink-0 text-center">
                      <div className="text-[17px] font-bold">{formatTime(s.starts_at)}</div>
                    </div>
                    <div className="min-w-0 flex-[1_1_200px]">
                      <div className="font-semibold">{s.lesson_name ?? s.name}</div>
                      <div className="text-sm text-muted">
                        {s.group.name} · {s.group.subject_category.name}
                      </div>
                    </div>
                    <SessionStatusChip status={s.status} prepared={Boolean(s.is_prepared)} />
                  </Link>
                ))
              )}
            </Card>

            <Card className="flex flex-[1_1_300px] flex-col gap-4">
              <CardHeader
                title={S.home.mySpecialties}
                action={
                  <Link href="/app/specialties" className="text-sm text-primary hover:underline">
                    {S.common.all}
                  </Link>
                }
              />
              {data.subscriptions.length === 0 ? (
                <EmptyState icon="layers" title={S.home.noSpecialties} />
              ) : (
                data.subscriptions.map((s) => (
                  <Link key={s.id} href={`/app/specialties?category=${s.subject_category_id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3.5 hover:border-primary">
                    <div>
                      <div className="font-semibold">{s.subject_category.name}</div>
                      <div className="text-sm text-muted">{S.nav.endsIn(s.remaining_days)}</div>
                    </div>
                    <Chip tone="neutral">{S.home.classesCount(s.groups_count ?? 0)}</Chip>
                  </Link>
                ))
              )}
              <ButtonLink href="/app/subscriptions" variant="outline">
                {S.home.addSpecialty}
              </ButtonLink>
            </Card>
          </div>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{S.home.features}</h2>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
              {FEATURES.map((f) => (
                <Card key={f.title} className="flex flex-col gap-2">
                  <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Icon name={f.icon} />
                  </span>
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-sm text-muted">{f.body}</div>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </QueryView>
  );
}
