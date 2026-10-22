"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Chip, StatTile } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { addToPortfolio } from "@/features/portfolio/portfolio-store";
import { useSubscriptions } from "@/features/shell/use-teacher";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { MyReports } from "@/lib/api/types";
import { saveCsv, stamp } from "@/lib/download";
import { percent } from "@/lib/format";
import { S } from "@/lib/strings";

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <span className="flex min-w-32 items-center gap-2">
      <span className="flex-1">
        <ProgressBar value={value} color={color} height={6} />
      </span>
      <span className="w-11 text-sm">{percent(value)}</span>
    </span>
  );
}

export default function MyReportsPage() {
  const toast = useToast();
  const subs = useSubscriptions();
  const [picked, setPicked] = useState<number | null>(null);
  const list = subs.data?.subscriptions ?? [];
  const categoryId = picked ?? list[0]?.subject_category_id;
  const query = useApiQuery<MyReports>(Endpoints.myReports, { category_id: categoryId }, { enabled: Boolean(categoryId) });
  const R = S.myReports;

  if (subs.isPending) return <PageSkeleton />;
  if (subs.error) return <ErrorState error={subs.error} onRetry={() => subs.refetch()} />;
  if (!list.length) return <EmptyState icon="chart" title={R.none} action={<ButtonLink href="/app/subscriptions">{S.nav.subscribeNow}</ButtonLink>} />;

  const d = query.data;
  const attendance = d && d.groups.length ? d.groups.reduce((n, g) => n + g.attendance_statistics.attendance_rate, 0) / d.groups.length : 0;
  const name = list.find((s) => s.subject_category_id === categoryId)?.subject_category.name ?? "";
  const rows = (d?.groups ?? []).map((g) => [g.group.name, g.group.total_students, percent(g.attendance_statistics.attendance_rate), percent(g.homework_statistics.submission_rate), percent(g.exam_statistics.pass_rate), percent(g.overall_performance.average_performance)]);

  return (
    <>
      <PageHeader
        title={R.title}
        subtitle={R.subtitle}
        actions={
          d && (
            <>
              <Button
                variant="outline"
                icon="folder"
                onClick={() =>
                  addToPortfolio({ title: `${R.title} · ${name}`, content: rows.map((r) => r.join(" · ")).join("\n") })
                    .then(() => toast.show(S.classroomReports.addedToPortfolio))
                    .catch(toast.error)
                }
              >
                {S.classroomReports.addToPortfolio}
              </Button>
              <Button variant="accent" icon="download" onClick={() => saveCsv([[R.classroom, R.studentsCol, R.attendanceCol, R.homeworkCol, R.examsCol, R.overallCol], ...rows], `my_reports_${stamp()}`)}>
                {R.exportBtn}
              </Button>
            </>
          )
        }
      />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-[1_1_260px] flex-col gap-2.5 lg:max-w-80">
          {list.map((s) => {
            const on = s.subject_category_id === categoryId;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(s.subject_category_id)}
                className={clsx("flex min-h-15 items-center justify-between gap-2 rounded-2xl border-[1.5px] px-4 text-start", on ? "border-primary bg-primary-soft" : "border-line bg-white hover:border-primary")}
              >
                <strong>{s.subject_category.name}</strong>
                <Chip tone="neutral">{S.home.classesCount(s.groups_count ?? 0)}</Chip>
              </button>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-[3_1_480px] flex-col gap-5">
          {query.isPending ? (
            <PageSkeleton cards={4} />
          ) : query.error || !d ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : (
            <>
              <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
                <StatTile label={R.overall} value={percent(d.overall_statistics.average_performance)} />
                <StatTile label={R.classrooms} value={d.total_groups_count} />
                <StatTile label={R.students} value={d.students_count_in_all_groups} />
                <StatTile label={R.attendance} value={percent(attendance)} />
              </div>
              <Card className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">{R.summary}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        {[R.classroom, R.studentsCol, R.attendanceCol, R.homeworkCol, R.examsCol, R.overallCol].map((h) => (
                          <th key={h} className="px-3 py-3 text-start font-medium whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.groups.map((g) => (
                        <tr key={g.group.id} className="border-b border-soft">
                          <td className="px-3 py-3 font-semibold whitespace-nowrap">
                            <Link href={`/app/classrooms/${g.group.id}/reports`} className="text-primary hover:underline">
                              {g.group.name}
                            </Link>
                          </td>
                          <td className="px-3 py-3">{g.group.total_students}</td>
                          <td className="px-3 py-3">
                            <Bar value={g.attendance_statistics.attendance_rate} color="var(--color-primary)" />
                          </td>
                          <td className="px-3 py-3">
                            <Bar value={g.homework_statistics.submission_rate} color="var(--color-accent)" />
                          </td>
                          <td className="px-3 py-3">
                            <Bar value={g.exam_statistics.pass_rate} color="var(--color-success)" />
                          </td>
                          <td className="px-3 py-3 font-bold">{percent(g.overall_performance.average_performance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">{R.sessions}</h2>
                <div className="flex flex-wrap gap-6">
                  <span>
                    {R.completed}: <strong>{d.sessions.completed_count}</strong>
                  </span>
                  <span>
                    {R.pending}: <strong>{d.sessions.pending_count}</strong>
                  </span>
                  <span>
                    {R.avgDuration}: <strong>{S.session.durationValue(d.sessions.average_duration_minutes)}</strong>
                  </span>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
