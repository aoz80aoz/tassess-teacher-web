"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { IndeterminateBar, ProgressBar, Ring } from "@/components/ui/Progress";
import { ErrorState, QueryView } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useClassroom, useClassroomCrumbs } from "@/features/classroom/use-classroom";
import { addToPortfolio } from "@/features/portfolio/portfolio-store";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { RankedStudent, RankingType, SessionStatistics, StudentSessionReport } from "@/lib/api/types";
import { saveCsv, stamp } from "@/lib/download";
import { formatTime, percent } from "@/lib/format";
import { S } from "@/lib/strings";

const RANKINGS: Record<RankingType, { title: string; field: string; format: (v: number) => string }> = {
  performance: { title: S.classroomReports.rankingTitle, field: "performance_rate", format: (v) => percent(v) },
  activity: { title: S.classroomReports.negativeActivity, field: "net_points", format: (v) => String(v) },
  homework: { title: S.classroomReports.noHomework, field: "average_performance", format: (v) => percent(v) },
  attendance: { title: S.classroomReports.absence, field: "attendance_rate", format: (v) => percent(v) },
};

function RankingDialog({ type, classroomId, onClose }: { type: RankingType | null; classroomId: number; onClose: () => void }) {
  const query = useApiQuery<RankedStudent[]>(Endpoints.getGroupStudents, { group_id: classroomId, type }, { enabled: type !== null });
  const meta = type ? RANKINGS[type] : null;
  // Support lists are the weakest first; the performance ranking best first.
  const list = type && type !== "performance" ? [...(query.data ?? [])].reverse() : query.data ?? [];
  return (
    <Dialog
      open={type !== null}
      onClose={onClose}
      title={meta?.title ?? ""}
      footer={
        <Button
          variant="accent"
          icon="download"
          disabled={!list.length}
          onClick={() => meta && saveCsv([[S.classroomReports.rankCol, S.students.name, S.classroomReports.valueCol], ...list.map((s, i) => [i + 1, s.name, meta.format(Number(s[meta.field] ?? 0))])], `ranking_${type}_${stamp()}`)}
        >
          {S.common.export}
        </Button>
      }
    >
      {query.isPending ? (
        <IndeterminateBar />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <ol className="flex flex-col gap-2">
          {list.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
              <span className="flex-1">{s.name}</span>
              <strong>{meta?.format(Number(s[meta.field] ?? 0))}</strong>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}

function StudentSessionDialog({ sessionId, classroomId, onClose }: { sessionId: number | null; classroomId: number; onClose: () => void }) {
  const students = useApiQuery<RankedStudent[]>(Endpoints.getGroupStudents, { group_id: classroomId, type: "performance" }, { enabled: sessionId !== null });
  const [studentId, setStudentId] = useState("");
  const chosen = studentId || String(students.data?.[0]?.id ?? "");
  const report = useApiQuery<StudentSessionReport>(Endpoints.getStudentSessionReport, { session_id: sessionId, student_id: Number(chosen) }, { enabled: sessionId !== null && Boolean(chosen) });
  const r = report.data;
  const R = S.classroomReports;
  const attendance = !r || r.attendance.is_present === null ? R.notTaken : !r.attendance.is_present ? R.absentLabel : r.attendance.is_late ? R.lateLabel : R.presentLabel;
  return (
    <Dialog open={sessionId !== null} onClose={onClose} title={R.studentReportTitle}>
      <div className="flex flex-col gap-4">
        <Select label={S.students.name} value={chosen} onChange={(e) => setStudentId(e.target.value)}>
          {(students.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {report.isFetching && <IndeterminateBar />}
        {r && (
          <div className="grid grid-cols-2 gap-3">
            {[
              [R.sessionAttendance, `${attendance}${r.attendance.is_late && r.attendance.present_at ? ` · ${formatTime(r.attendance.present_at)}` : ""}`],
              [R.positiveCount, String(r.activity.positive_count)],
              [R.negativeCount, String(r.activity.negative_count)],
              [R.netPoints, String(r.activity.net_points)],
              [R.homeworkPassed, `${r.homework.passed_count} / ${r.homework.total_count}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-surface p-4">
                <div className="text-sm text-muted">{label}</div>
                <div className="mt-1 text-lg font-bold">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}

export default function ClassroomReportsPage() {
  const { id } = useParams<{ id: string }>();
  const classroomId = Number(id);
  const toast = useToast();
  const query = useClassroom(classroomId);
  const crumbs = useClassroomCrumbs(query.data, S.classroom.tileReports);
  const [sessionId, setSessionId] = useState("");
  const [ranking, setRanking] = useState<RankingType | null>(null);
  const [studentReport, setStudentReport] = useState<number | null>(null);
  const sessions = (query.data?.class_sessions ?? []).filter((s) => s.status !== "pending");
  const chosen = sessionId || String(sessions[0]?.id ?? "");
  const stats = useApiQuery<SessionStatistics>(Endpoints.getSessionStatistics, { session_id: Number(chosen) }, { enabled: Boolean(chosen) });
  const R = S.classroomReports;

  return (
    <QueryView query={query}>
      {(c) => {
        const st = c.statistics;
        const general = [
          { label: R.attendance, v: st.attendance_statistics.attendance_rate, c: "var(--color-primary)" },
          { label: R.homework, v: st.homework_statistics.submission_rate, c: "var(--color-accent)" },
          { label: R.examsPass, v: st.exam_statistics.pass_rate, c: "var(--color-success)" },
        ];
        const patterns = st.students_learning_patterns.patterns.filter((p) => p.count > 0);
        const support: { type: RankingType; title: string; icon: IconName }[] = [
          { type: "activity", title: R.negativeActivity, icon: "alert" },
          { type: "homework", title: R.noHomework, icon: "fileAdd" },
          { type: "attendance", title: R.absence, icon: "userX" },
        ];
        const exportAll = () =>
          saveCsv(
            [
              [c.name],
              [S.classroom.ringAverage, percent(st.overall_performance.average_performance)],
              ...general.map((g) => [g.label, percent(g.v)]),
              [S.students.title, st.group.total_students],
              [S.classroom.sessions, st.group.total_sessions],
            ],
            `classroom_report_${stamp()}`,
          );
        return (
          <>
            <PageHeader
              crumbs={crumbs}
              title={R.title}
              actions={
                <>
                  <Button
                    variant="outline"
                    icon="folder"
                    onClick={() =>
                      addToPortfolio({
                        title: `${R.title} · ${c.name}`,
                        content: [`${S.classroom.ringAverage}: ${percent(st.overall_performance.average_performance)}`, ...general.map((g) => `${g.label}: ${percent(g.v)}`)].join("\n"),
                      })
                        .then(() => toast.show(R.addedToPortfolio))
                        .catch(toast.error)
                    }
                  >
                    {R.addToPortfolio}
                  </Button>
                  <Button variant="accent" icon="download" onClick={exportAll}>
                    {S.common.export}
                  </Button>
                </>
              }
            />

            <button type="button" onClick={() => setRanking("performance")} className="flex min-h-14 items-center gap-3 rounded-2xl bg-primary px-5 text-start font-semibold text-white">
              <Icon name="trophy" />
              <span className="flex-1">{R.ranking}</span>
              <Icon name="chevronLeft" />
            </button>

            <div className="flex flex-wrap items-stretch gap-6">
              <div className="flex flex-[1_1_380px] flex-col gap-6">
                <Card className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold">{R.general}</h2>
                  <div className="flex flex-wrap items-center gap-6">
                    <Ring value={st.overall_performance.average_performance} size={120} track="var(--color-success-soft)" />
                    <div className="flex flex-[1_1_200px] flex-col gap-3.5">
                      {general.map((g) => (
                        <div key={g.label} className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-sm">
                            <span>{g.label}</span>
                            <strong>{percent(g.v)}</strong>
                          </div>
                          <ProgressBar value={g.v} color={g.c} height={5} label={g.label} />
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
                <Card className="flex flex-col gap-3 border-accent-200 bg-peach">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-white text-accent">
                      <Icon name="bulb" className="size-6" />
                    </span>
                    <strong>{R.patterns}</strong>
                  </div>
                  {patterns.length === 0 ? (
                    <p className="text-sm text-accent-ink">{R.noPatterns}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {patterns.map((p) => (
                        <Chip key={p.id} tone="accent" className="!bg-white">{`${p.name} ${percent(p.percentage)}`}</Chip>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              <Card className="flex flex-[1_1_380px] flex-col gap-4">
                <h2 className="text-lg font-semibold">{R.sessionReport}</h2>
                {sessions.length === 0 ? (
                  <p className="py-8 text-center text-muted">{R.noSessions}</p>
                ) : (
                  <>
                    <Select aria-label={R.chooseSession} value={chosen} onChange={(e) => setSessionId(e.target.value)}>
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.lesson_name}
                        </option>
                      ))}
                    </Select>
                    {stats.isPending ? (
                      <IndeterminateBar />
                    ) : stats.data ? (
                      [
                        { label: R.sessionOverall, value: percent(stats.data.overall_performance.overall_score), v: stats.data.overall_performance.overall_score, c: "var(--color-success)", t: "var(--color-success-soft)" },
                        { label: R.sessionHomework, value: percent(stats.data.homework_statistics.submission_rate), v: stats.data.homework_statistics.submission_rate, c: "var(--color-info)", t: "var(--color-info-soft)" },
                        {
                          label: R.sessionAttendance,
                          value: `${stats.data.attendance_statistics.present_count} / ${stats.data.attendance_statistics.total_students}`,
                          v: stats.data.attendance_statistics.attendance_rate,
                          c: "var(--color-primary)",
                          t: "var(--color-tile)",
                        },
                      ].map((x) => (
                        <div key={x.label} className="flex flex-col gap-2.5 rounded-2xl border border-line p-4">
                          <div className="flex items-center justify-between">
                            <span>{x.label}</span>
                            <Chip tone="neutral">{x.value}</Chip>
                          </div>
                          <ProgressBar value={x.v} color={x.c} track={x.t} height={12} label={x.label} />
                        </div>
                      ))
                    ) : null}
                    <button type="button" onClick={() => setStudentReport(Number(chosen))} className="mt-auto flex min-h-14 items-center gap-3 rounded-2xl bg-tile px-5 text-start font-semibold text-primary">
                      <span className="flex-1">{R.perStudent}</span>
                      <Icon name="chevronLeft" />
                    </button>
                  </>
                )}
              </Card>
            </div>

            <section className="flex flex-col gap-3.5">
              <h2 className="text-lg font-semibold">{R.needSupport}</h2>
              <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                {support.map((x) => (
                  <div key={x.type} className="flex items-center gap-3.5 rounded-2xl bg-soft p-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-primary">
                      <Icon name={x.icon} />
                    </span>
                    <strong className="flex-1">{x.title}</strong>
                    <Button variant="outline" size="sm" onClick={() => setRanking(x.type)}>
                      {S.common.details}
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <RankingDialog type={ranking} classroomId={classroomId} onClose={() => setRanking(null)} />
            <StudentSessionDialog sessionId={studentReport} classroomId={classroomId} onClose={() => setStudentReport(null)} />
          </>
        );
      }}
    </QueryView>
  );
}

