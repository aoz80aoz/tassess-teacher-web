"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader, Chip } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Ring } from "@/components/ui/Progress";
import { QueryView } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { SessionFormDialog } from "@/features/classroom/SessionFormDialog";
import { useClassroom, useClassroomCrumbs } from "@/features/classroom/use-classroom";
import { SessionStatusChip } from "@/features/common/SessionStatusChip";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { ClassroomDetails, EvaluationElementsByPhase } from "@/lib/api/types";
import { formatDate, formatTime } from "@/lib/format";
import { S } from "@/lib/strings";

function ElementsPanel({ classroom }: { classroom: ClassroomDetails }) {
  const [phase, setPhase] = useState<"phase_1" | "phase_2">("phase_1");
  const query = useApiQuery<EvaluationElementsByPhase>(Endpoints.evaluationElementsGroup, { group_id: classroom.id });
  const list = query.data?.[phase] ?? [];
  return (
    <Card className="flex flex-[1_1_320px] flex-col gap-3.5">
      <CardHeader title={S.classroom.elements} />
      <Tabs
        label={S.classroom.elements}
        value={phase}
        onChange={setPhase}
        items={[
          { key: "phase_1", label: S.common.period1 },
          { key: "phase_2", label: S.common.period2 },
        ]}
      />
      {list.length === 0 && !query.isPending ? (
        <p className="py-4 text-center text-sm text-muted">{S.classroom.noElements}</p>
      ) : (
        list.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-3">
            <span>{e.name}</span>
            <Chip>{S.classroom.degrees(e.max_degree)}</Chip>
          </div>
        ))
      )}
      <ButtonLink href={`/app/subjects/${classroom.subject_id}/evaluation-elements`} variant="outline">
        {S.subject.manageElements}
      </ButtonLink>
    </Card>
  );
}

export default function ClassroomPage() {
  const { id } = useParams<{ id: string }>();
  const classroomId = Number(id);
  const router = useRouter();
  const toast = useToast();
  const query = useClassroom(classroomId);
  const crumbs = useClassroomCrumbs(query.data);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [addingSession, setAddingSession] = useState(false);
  const rename = useApiMutation(Endpoints.updateGroup, { invalidates: [Endpoints.showGroup, Endpoints.allGroups] });
  const remove = useApiMutation(Endpoints.deleteGroup, { invalidates: [Endpoints.allGroups, Endpoints.home, Endpoints.mySubscriptions, Endpoints.subjectsByCategory] });

  return (
    <QueryView query={query}>
      {(c) => {
        const st = c.statistics;
        const completed = c.class_sessions.filter((s) => s.status === "completed").length;
        const tiles: { label: string; sub: string; href: string; icon: IconName }[] = [
          { label: S.classroom.tileStudents, sub: S.classroom.studentsCount(st.group.total_students), href: `/app/classrooms/${c.id}/students`, icon: "users" },
          { label: S.classroom.tileReports, sub: S.classroom.tileReportsSub, href: `/app/classrooms/${c.id}/reports`, icon: "chart" },
          { label: S.classroom.tileExams, sub: S.classroom.examsCount(st.exam_statistics.total_exams), href: `/app/classrooms/${c.id}/exams`, icon: "doc" },
          { label: S.classroom.tileSkills, sub: S.classroom.tileSkillsSub, href: `/app/classrooms/${c.id}/skills`, icon: "star" },
        ];
        return (
          <>
            <PageHeader
              crumbs={crumbs}
              title={c.name}
              actions={
                <>
                  <Button
                    variant="outline"
                    icon="edit"
                    onClick={() => {
                      setName(c.name);
                      setRenaming(true);
                    }}
                  >
                    {S.classroom.rename}
                  </Button>
                  <Button variant="danger" icon="trash" onClick={() => setDeleting(true)}>
                    {S.classroom.deleteClassroom}
                  </Button>
                  <Button icon="plus" onClick={() => setAddingSession(true)}>
                    {S.classroom.addSession}
                  </Button>
                </>
              }
            />

            <Card className="flex flex-wrap justify-around gap-8 p-7">
              {[
                { v: st.overall_performance.average_performance, c: "var(--color-success)", label: S.classroom.ringAverage, sub: S.classroom.ringAverageSub },
                { v: st.attendance_statistics.attendance_rate, c: "var(--color-primary)", label: S.classroom.ringAttendance, sub: S.classroom.ringAttendanceSub },
                { v: st.exam_statistics.pass_rate, c: "var(--color-accent)", label: S.classroom.ringPass, sub: S.classroom.ringPassSub(st.exam_statistics.total_exams) },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-4">
                  <Ring value={r.v} color={r.c} />
                  <div className="flex max-w-44 flex-col gap-1">
                    <strong>{r.label}</strong>
                    <span className="text-sm text-muted">{r.sub}</span>
                  </div>
                </div>
              ))}
            </Card>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {tiles.map((t) => (
                <Link key={t.href} href={t.href} className="flex min-h-21 items-center gap-3.5 rounded-2xl bg-tile p-4.5 hover:bg-tile-hover">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-primary">
                    <Icon name={t.icon} className="size-6" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <strong>{t.label}</strong>
                    <span className="text-sm text-muted">{t.sub}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-start gap-6">
              <Card className="flex flex-[2_1_460px] flex-col gap-3.5">
                <CardHeader
                  title={
                    <>
                      {S.classroom.sessions} <span className="text-sm font-normal text-muted">({completed}/{c.class_sessions.length})</span>
                    </>
                  }
                  action={<span className="text-sm text-muted">{S.classroom.newestFirst}</span>}
                />
                {c.class_sessions.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <p className="font-semibold">{S.classroom.noSessions}</p>
                    <p className="text-sm text-muted">{S.classroom.noSessionsBody}</p>
                    <Button icon="plus" onClick={() => setAddingSession(true)}>
                      {S.classroom.addSession}
                    </Button>
                  </div>
                ) : (
                  c.class_sessions.map((s) => (
                    <Link key={s.id} href={`/app/sessions/${s.id}`} className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-line px-4 py-3.5 hover:border-primary">
                      <div className="min-w-0 flex-[1_1_220px]">
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-sm text-muted">{s.lesson_name ?? S.common.dash}</div>
                      </div>
                      <span className="text-sm text-muted">
                        {formatDate(s.starts_at)} · {formatTime(s.starts_at)}
                      </span>
                      <SessionStatusChip status={s.status} prepared={Boolean(s.is_prepared)} />
                    </Link>
                  ))
                )}
              </Card>
              <ElementsPanel classroom={c} />
            </div>

            <Dialog
              open={renaming}
              onClose={() => setRenaming(false)}
              title={S.classroom.renameTitle}
              size="sm"
              footer={
                <>
                  <Button
                    loading={rename.isPending}
                    disabled={!name.trim()}
                    onClick={() =>
                      name.trim() === c.name
                        ? setRenaming(false)
                        : rename.mutate(
                            { group_id: c.id, name: name.trim() },
                            {
                              onSuccess: () => {
                                setRenaming(false);
                                toast.show(S.common.savedSuccessfully);
                              },
                              onError: toast.error,
                            },
                          )
                    }
                  >
                    {S.common.save}
                  </Button>
                  <Button variant="soft" onClick={() => setRenaming(false)}>
                    {S.common.cancel}
                  </Button>
                </>
              }
            >
              <TextField label={S.subject.classroomName} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Dialog>

            <ConfirmDialog
              open={deleting}
              onClose={() => setDeleting(false)}
              loading={remove.isPending}
              title={S.classroom.deleteClassroom}
              body={S.classroom.deleteClassroomBody(c.name)}
              onConfirm={() =>
                remove.mutate(
                  { group_id: c.id },
                  {
                    onSuccess: () => {
                      toast.show(S.common.deletedSuccessfully);
                      router.replace(`/app/subjects/${c.subject_id}`);
                    },
                    onError: toast.error,
                  },
                )
              }
            />

            <SessionFormDialog open={addingSession} onClose={() => setAddingSession(false)} classroomId={c.id} onSaved={(s) => router.push(`/app/sessions/${s.id}`)} />
          </>
        );
      }}
    </QueryView>
  );
}
