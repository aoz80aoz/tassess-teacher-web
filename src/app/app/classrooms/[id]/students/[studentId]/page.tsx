"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, Chip } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/Progress";
import { QueryView } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useClassroom, useClassroomCrumbs } from "@/features/classroom/use-classroom";
import { ExportDialog } from "@/features/common/ExportDialog";
import { BadgesDialog, BehaviourDialog, DegreesDialog, PatternsDialog, TaseeseReportDialog } from "@/features/students/StudentDialogs";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { StudentBehaviours, StudentDetails, StudentExam } from "@/lib/api/types";
import { saveCsv, stamp } from "@/lib/download";
import { examTitle, percent } from "@/lib/format";
import { S } from "@/lib/strings";

type DialogKind = "degrees" | "badges" | "patterns" | "behaviour" | "taseese" | "export" | "remove" | null;

export default function StudentPage() {
  const { id, studentId } = useParams<{ id: string; studentId: string }>();
  const classroomId = Number(id);
  const sid = Number(studentId);
  const router = useRouter();
  const toast = useToast();
  const classroom = useClassroom(classroomId);
  const query = useApiQuery<StudentDetails>(Endpoints.getStudent, { group_id: classroomId, student_id: sid });
  const behaviours = useApiQuery<StudentBehaviours>(Endpoints.studentBehaviours, { group_id: classroomId, student_id: sid });
  const work = useApiQuery<{ exams: StudentExam[] }>(Endpoints.studentExams, { group_id: classroomId, student_id: sid, category: "all" });
  const crumbs = useClassroomCrumbs(classroom.data, query.data?.student.name);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const remove = useApiMutation(Endpoints.deleteStudent, { invalidates: [Endpoints.getGroupStudents, Endpoints.showGroup, Endpoints.allGroups] });

  return (
    <QueryView query={query}>
      {(d) => {
        const st = d.student;
        const stats = [
          { label: S.student.attendanceRate, v: d.attendance_rate, c: "var(--color-primary)" },
          { label: S.student.examAverage, v: d.exam_average_grade.max_grade ? (d.exam_average_grade.grade / d.exam_average_grade.max_grade) * 100 : 0, c: "var(--color-success)" },
          { label: S.student.homeworkAverage, v: d.homework_average_grade, c: "var(--color-accent)" },
          { label: S.student.overall, v: d.overall_score, c: "var(--color-info)" },
        ];
        const exportReport = () =>
          saveCsv(
            [
              [S.students.name, st.name],
              [S.students.phone, st.phone],
              [S.students.parentPhone, st.parent_phone ?? ""],
              ...stats.map((s) => [s.label, percent(s.v)]),
              [S.student.behaviour, S.student.behaviourCounts(behaviours.data?.positive_count ?? 0, behaviours.data?.negative_count ?? 0)],
              ...(work.data?.exams ?? []).map((e) => [examTitle(e, { exam: S.assessments.kindExam, homework: S.assessments.kindHomework }), e.result?.student_marks ? `${Number(e.result.student_marks)} / ${Number(e.total_marks)}` : S.student.notEvaluated]),
            ],
            `student_${st.id}_${stamp()}`,
          );
        const whatsapp = st.parent_phone ? `https://wa.me/${st.parent_phone.replace(/\D/g, "")}` : null;
        return (
          <>
            <PageHeader crumbs={crumbs} title={st.name} />
            <Card className="flex flex-wrap items-center gap-5 p-6">
              <span className="grid size-20 shrink-0 place-items-center rounded-full bg-accent-200 text-3xl font-bold text-accent-ink" aria-hidden="true">
                {st.name.charAt(0)}
              </span>
              <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
                <div className="text-sm text-muted">{d.group_name}</div>
                <div className="flex flex-wrap gap-2">
                  <Chip tone="neutral">
                    <span dir="ltr">{st.phone}</span>
                  </Chip>
                  {st.parent_phone && (
                    <Chip tone="neutral">
                      {S.student.guardian("")}
                      <span dir="ltr">{st.parent_phone}</span>
                    </Chip>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="accent" icon="download" onClick={() => setDialog("export")}>
                  {S.students.exportReport}
                </Button>
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-success px-5 font-semibold text-white hover:bg-success-ink">
                    <Icon name="whatsapp" />
                    {S.student.contactGuardian}
                  </a>
                )}
              </div>
            </Card>

            <Card className="flex flex-col gap-5">
              <CardHeader title={S.student.indicators} />
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span>{s.label}</span>
                      <strong>{percent(s.v)}</strong>
                    </div>
                    <ProgressBar value={s.v} color={s.c} height={10} label={s.label} />
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              <button type="button" disabled={d.has_taseese_report === false} onClick={() => setDialog("taseese")} className="flex items-center gap-3.5 rounded-2xl border border-primary-200 bg-tile p-5 text-start disabled:opacity-60">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-primary">
                  <Icon name="chart" className="size-6" />
                </span>
                <span className="flex-1">
                  <strong className="block">{S.student.taseeseReports}</strong>
                  <span className="text-sm text-muted">{d.has_taseese_report === false ? S.student.taseeseNone : S.common.details}</span>
                </span>
                <Icon name="chevronLeft" />
              </button>
              <button type="button" onClick={() => setDialog("degrees")} className="flex items-center gap-3.5 rounded-2xl border border-accent-200 bg-accent-soft p-5 text-start">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-accent">
                  <Icon name="clipboard" className="size-6" />
                </span>
                <span className="flex-1">
                  <strong className="block">{S.student.evaluation}</strong>
                  <span className="text-sm text-muted">{S.student.evaluationSub}</span>
                </span>
                <Icon name="chevronLeft" />
              </button>
            </div>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              <Card className="flex flex-col gap-3.5">
                <CardHeader
                  title={S.student.badges}
                  action={
                    <Button variant="outline" size="sm" onClick={() => setDialog("badges")}>
                      {S.student.giveBadge}
                    </Button>
                  }
                />
                {st.badges.length === 0 ? (
                  <p className="text-sm text-muted">{S.student.noBadges}</p>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {st.badges.map((b) => (
                      <div key={b.id} className="flex w-20 flex-col items-center gap-1.5 text-center">
                        <span className="grid size-14 place-items-center rounded-full bg-warning-soft text-warning-ink">
                          <Icon name="star" className="size-7" />
                        </span>
                        <span className="text-[13px]">{b.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card className="flex flex-col gap-3.5">
                <CardHeader
                  title={S.student.patterns}
                  action={
                    <Button variant="outline" size="sm" onClick={() => setDialog("patterns")}>
                      {S.common.edit}
                    </Button>
                  }
                />
                {st.learning_patterns.length === 0 ? (
                  <p className="text-sm text-muted">{S.student.noPatterns}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {st.learning_patterns.map((p) => (
                      <Chip key={p.id}>{p.name}</Chip>
                    ))}
                  </div>
                )}
                <p className="text-sm leading-7 text-muted">{S.student.patternsHint}</p>
              </Card>
            </div>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              <Card className="flex flex-col gap-3">
                <CardHeader
                  title={S.student.behaviour}
                  subtitle={behaviours.data && S.student.behaviourCounts(behaviours.data.positive_count, behaviours.data.negative_count)}
                  action={
                    <Button variant="outline" size="sm" onClick={() => setDialog("behaviour")}>
                      {S.student.addBehaviour}
                    </Button>
                  }
                />
                {(behaviours.data?.behaviours ?? []).length === 0 ? (
                  <p className="text-sm text-muted">{S.student.noBehaviour}</p>
                ) : (
                  behaviours.data!.behaviours.map((b) => (
                    <div key={b.type} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-3">
                      <span>{b.type}</span>
                      <Chip tone={b.is_positive ? "success" : "danger"}>{`${b.is_positive ? "+" : "-"}${b.points}`}</Chip>
                    </div>
                  ))
                )}
              </Card>
              <Card className="flex flex-col gap-3">
                <CardHeader title={S.student.work} />
                {(work.data?.exams ?? []).length === 0 ? (
                  <p className="text-sm text-muted">{S.student.noWork}</p>
                ) : (
                  work.data!.exams.map((e) => {
                    const graded = e.result?.student_marks != null;
                    return (
                      <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-3">
                        <span>
                          <strong className="font-semibold">{examTitle(e, { exam: S.assessments.kindExam, homework: S.assessments.kindHomework })}</strong> <span className="text-sm text-muted">· {e.category === "exam" ? S.assessments.kindExam : S.assessments.kindHomework}</span>
                        </span>
                        <Chip tone={graded ? (e.result!.is_passed ? "success" : "danger") : "warning"}>
                          {graded ? `${Number(e.result!.student_marks)} / ${Number(e.total_marks)}` : S.student.notEvaluated}
                        </Chip>
                      </div>
                    );
                  })
                )}
              </Card>
            </div>

            <div>
              <Button variant="danger" icon="trash" onClick={() => setDialog("remove")}>
                {S.student.remove}
              </Button>
            </div>

            <DegreesDialog open={dialog === "degrees"} onClose={() => setDialog(null)} classroomId={classroomId} studentId={sid} />
            <BadgesDialog open={dialog === "badges"} onClose={() => setDialog(null)} classroomId={classroomId} studentId={sid} current={st.badges} />
            <PatternsDialog open={dialog === "patterns"} onClose={() => setDialog(null)} classroomId={classroomId} studentId={sid} current={st.learning_patterns} />
            <BehaviourDialog open={dialog === "behaviour"} onClose={() => setDialog(null)} studentId={sid} sessions={classroom.data?.class_sessions ?? []} />
            <TaseeseReportDialog open={dialog === "taseese"} onClose={() => setDialog(null)} phone={st.phone} subjectId={classroom.data?.subject_id ?? 0} />
            <ExportDialog open={dialog === "export"} onClose={() => setDialog(null)} classroomId={classroomId} studentIds={[sid]} onExportReport={exportReport} reportLabel={S.student.indicators} filePrefix={`student_${sid}`} />
            <ConfirmDialog
              open={dialog === "remove"}
              onClose={() => setDialog(null)}
              loading={remove.isPending}
              title={S.student.remove}
              body={S.student.removeBody(st.name)}
              onConfirm={() =>
                remove.mutate(
                  { group_id: classroomId, student_id: sid },
                  {
                    onSuccess: () => {
                      toast.show(S.common.deletedSuccessfully);
                      router.replace(`/app/classrooms/${classroomId}/students`);
                    },
                    onError: toast.error,
                  },
                )
              }
            />
          </>
        );
      }}
    </QueryView>
  );
}
