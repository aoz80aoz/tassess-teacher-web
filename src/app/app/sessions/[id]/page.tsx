"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryView } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { SessionFormDialog } from "@/features/classroom/SessionFormDialog";
import { SessionStatusChip } from "@/features/common/SessionStatusChip";
import { LessonTextCard } from "@/features/session/LessonTextCard";
import { isEditable, useSession, useSessionCrumbs } from "@/features/session/use-session";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { Exam, MindMap, Question } from "@/lib/api/types";
import { formatDate, formatTime } from "@/lib/format";
import { S } from "@/lib/strings";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const router = useRouter();
  const toast = useToast();
  const query = useSession(sessionId);
  const crumbs = useSessionCrumbs(query.data);
  const questions = useApiQuery<Question[]>(Endpoints.classSessionQuestions, { session_id: sessionId });
  const maps = useApiQuery<MindMap[]>(Endpoints.classSessionMindMaps, { session_id: sessionId });
  const homeworks = useApiQuery<Exam[]>(Endpoints.groupExams, { group_id: query.data?.group_id, session_id: sessionId }, { enabled: Boolean(query.data) });
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remove = useApiMutation(Endpoints.classSessionDelete, { invalidates: [Endpoints.showGroup, Endpoints.home] });

  return (
    <QueryView query={query}>
      {(s) => {
        const editable = isEditable(s);
        const att = s.attendance_statistics;
        const tiles: { label: string; sub: string; href: string; icon: IconName }[] = [
          { label: S.session.tilePrep, sub: S.session.tilePrepSub(questions.data?.length ?? 0, maps.data?.length ?? 0), href: `/app/sessions/${s.id}/preparation`, icon: "book" },
          { label: S.session.tileAttendance, sub: att?.attendance ? `${att.present} / ${att.total}` : S.status[s.status], href: `/app/sessions/${s.id}/attendance`, icon: "userCheck" },
          { label: S.session.tileHomeworks, sub: String(homeworks.data?.filter((e) => e.category === "homework").length ?? 0), href: `/app/sessions/${s.id}/homeworks`, icon: "fileAdd" },
          { label: S.session.tileAssess, sub: S.session.tileAssessSub, href: `/app/sessions/${s.id}/run?tab=students`, icon: "star" },
        ];
        const info = [
          [S.session.type, s.type],
          [S.session.grouping, s.grouping_method === "random" ? S.session.random : S.session.kagan],
          [S.session.unit, s.unit_name ?? S.common.dash],
          [S.session.lesson, s.lesson_name ?? S.common.dash],
          [S.session.duration, S.session.durationValue(s.duration_minutes)],
          [S.session.date, formatDate(s.starts_at, true)],
          [S.session.time, formatTime(s.starts_at)],
          [S.session.preparation, s.is_prepared ? S.status.prepared : S.status.notPrepared],
        ];
        return (
          <>
            <PageHeader
              crumbs={crumbs}
              title={s.name}
              subtitle={[s.lesson_name, s.unit_name].filter(Boolean).join(" · ")}
              actions={
                <>
                  <Button variant="outline" icon="edit" aria-disabled={!editable} className={editable ? undefined : "opacity-55"} onClick={() => (editable ? setEditing(true) : toast.show(S.session.startedCannotEdit, "info"))}>
                    {S.common.edit}
                  </Button>
                  <Button variant="danger" icon="trash" onClick={() => setDeleting(true)}>
                    {S.common.delete}
                  </Button>
                  {s.status !== "completed" && (
                    <ButtonLink href={`/app/sessions/${s.id}/run`} variant="accent" icon="play">
                      {s.status === "in_progress" ? S.session.continue : S.session.start}
                    </ButtonLink>
                  )}
                </>
              }
            />

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              {tiles.map((t) => (
                <Link key={t.href} href={t.href} className="flex min-h-32 flex-col items-center justify-center gap-2.5 rounded-2xl bg-tile p-5 text-center hover:bg-tile-hover">
                  <span className="grid size-13 place-items-center rounded-2xl bg-white text-primary">
                    <Icon name={t.icon} className="size-6" />
                  </span>
                  <strong>{t.label}</strong>
                  <span className="text-sm text-muted">{t.sub}</span>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-start gap-6">
              <Card className="flex flex-[1_1_360px] flex-col gap-3.5">
                <CardHeader title={S.session.info} action={<SessionStatusChip status={s.status} prepared={Boolean(s.is_prepared)} />} />
                <dl className="grid grid-cols-2 gap-2.5">
                  {info.map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-1 rounded-xl bg-surface px-3.5 py-3">
                      <dt className="text-[13px] text-muted">{label}</dt>
                      <dd className="font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <div className="flex flex-[1.3_1_420px] flex-col gap-4">
                <LessonTextCard title={S.session.objectives} text={s.lesson_objectives} />
                <LessonTextCard title={S.session.outcomes} text={s.educational_outcome} />
                <LessonTextCard title={S.session.prepText} text={s.preparation_text} />
              </div>
            </div>

            <SessionFormDialog open={editing} onClose={() => setEditing(false)} classroomId={s.group_id} session={s} />
            <ConfirmDialog
              open={deleting}
              onClose={() => setDeleting(false)}
              loading={remove.isPending}
              title={S.session.deleteTitle}
              body={S.session.deleteBody}
              onConfirm={() =>
                remove.mutate(
                  { session_id: s.id },
                  {
                    onSuccess: () => {
                      toast.show(S.common.deletedSuccessfully);
                      router.replace(`/app/classrooms/${s.group_id}`);
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
