"use client";

import clsx from "clsx";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { IndeterminateBar, ProgressBar } from "@/components/ui/Progress";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { useClassroom, useClassroomCrumbs } from "@/features/classroom/use-classroom";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { Skill, SkillStatus, SkillStudent } from "@/lib/api/types";
import { formatDate, percent } from "@/lib/format";
import { S } from "@/lib/strings";

function StudentsDialog({ skill, status, classroomId, onClose }: { skill: Skill | null; status: SkillStatus; classroomId: number; onClose: () => void }) {
  const query = useApiQuery<SkillStudent[]>(Endpoints.skillsGroupStudents, { group_id: classroomId, skill_id: skill?.id, status }, { enabled: Boolean(skill) });
  return (
    <Dialog open={skill !== null} onClose={onClose} title={skill?.name ?? ""} size="sm">
      {query.isPending ? (
        <IndeterminateBar />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <ul className="flex flex-col gap-2">
          {(query.data ?? []).map((s) => (
            <li key={s.student_id} className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
              <span>{s.name}</span>
              {s.improved_at && <Chip tone="success">{formatDate(s.improved_at)}</Chip>}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

export default function SkillsPage() {
  const { id } = useParams<{ id: string }>();
  const classroomId = Number(id);
  const toast = useToast();
  const classroom = useClassroom(classroomId);
  const crumbs = useClassroomCrumbs(classroom.data, S.classroom.tileSkills);
  const [status, setStatus] = useState<SkillStatus>("missing");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [studentsOf, setStudentsOf] = useState<Skill | null>(null);
  const [confirming, setConfirming] = useState(false);
  const missing = useApiQuery<Skill[]>(Endpoints.skillsGroup, { group_id: classroomId, status: "missing" });
  const improved = useApiQuery<Skill[]>(Endpoints.skillsGroup, { group_id: classroomId, status: "improved" });
  const improve = useApiMutation(Endpoints.skillsImprove, { invalidates: [Endpoints.skillsGroup, Endpoints.skillsGroupStudents] });
  const remove = useApiMutation(Endpoints.skillsDelete, { invalidates: [Endpoints.skillsGroup, Endpoints.skillsGroupStudents] });
  const query = status === "missing" ? missing : improved;
  const list = query.data ?? [];
  const selected = list.find((s) => s.id === selectedId) ?? list[0] ?? null;
  // Postman: improve / delete take skill_ids and the student_ids they apply to.
  const affected = useApiQuery<SkillStudent[]>(Endpoints.skillsGroupStudents, { group_id: classroomId, skill_id: selected?.id, status }, { enabled: Boolean(selected) });
  const body = selected && affected.data ? { group_id: classroomId, skill_ids: [selected.id], student_ids: affected.data.map((s) => s.student_id) } : null;
  const busy = !body || body.student_ids.length === 0;

  return (
    <>
      <PageHeader crumbs={crumbs} title={S.skills.title} />
      <Tabs
        className="self-start"
        label={S.skills.title}
        value={status}
        onChange={(s) => {
          setStatus(s);
          setSelectedId(null);
        }}
        items={[
          { key: "missing", label: S.skills.missingTab(missing.data?.length ?? 0) },
          { key: "improved", label: S.skills.improvedTab(improved.data?.length ?? 0) },
        ]}
      />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon="star" title={status === "missing" ? S.skills.none : S.skills.noneImproved} />
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <div className="grid min-w-0 flex-[1.6_1_460px] gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
            {list.map((s) => (
              <article key={s.id} className={clsx("flex flex-col gap-3 rounded-2xl border bg-white p-5", selected?.id === s.id ? "border-primary" : "border-line")}>
                <strong className="leading-7">{s.name}</strong>
                <div className="flex justify-between text-sm text-muted">
                  <span>{S.skills.loss}</span>
                  <strong className="text-danger-ink">{percent(s.wrong_percentage)}</strong>
                </div>
                <ProgressBar value={s.wrong_percentage} color="var(--color-danger)" label={S.skills.loss} />
                <div className="text-sm text-muted">{status === "missing" ? S.skills.studentsMissing(s.students_wrong) : S.skills.studentsImproved(s.students_wrong)}</div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStudentsOf(s)}>
                    {S.skills.showStudents}
                  </Button>
                  <Button variant="soft" size="sm" onClick={() => setSelectedId(s.id)}>
                    {S.skills.showPlan}
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {selected && (
            <Card className="flex flex-[1_1_320px] flex-col gap-3.5 p-6" aria-label={S.skills.plan}>
              <Chip tone="danger" className="self-start">
                {`${S.skills.loss} ${percent(selected.wrong_percentage)}`}
              </Chip>
              <h2 className="text-xl font-semibold leading-relaxed">
                {S.skills.plan}: {selected.name}
              </h2>
              <p className="whitespace-pre-line leading-8 text-ink-2">{selected.remedial_plan ?? S.skills.noPlan}</p>
              {status === "missing" && (
                <Button
                  variant="success"
                  icon="check"
                  disabled={busy}
                  loading={improve.isPending}
                  onClick={() =>
                    body &&
                    improve.mutate(body, {
                      onSuccess: () => {
                        setSelectedId(null);
                        toast.show(S.skills.moved);
                      },
                      onError: toast.error,
                    })
                  }
                >
                  {S.skills.move}
                </Button>
              )}
              <Button variant="danger" icon="trash" disabled={busy} onClick={() => setConfirming(true)}>
                {S.skills.deleteSkill}
              </Button>
            </Card>
          )}
        </div>
      )}

      <StudentsDialog skill={studentsOf} status={status} classroomId={classroomId} onClose={() => setStudentsOf(null)} />
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        loading={remove.isPending}
        title={S.skills.deleteSkill}
        body={selected?.name}
        confirmLabel={S.common.delete}
        onConfirm={() =>
          body &&
          remove.mutate(body, {
            onSuccess: () => {
              setConfirming(false);
              setSelectedId(null);
              toast.show(S.common.deletedSuccessfully);
            },
            onError: toast.error,
          })
        }
      />
    </>
  );
}
