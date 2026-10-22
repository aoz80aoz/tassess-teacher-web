"use client";

import clsx from "clsx";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { IndeterminateBar } from "@/components/ui/Progress";
import { EmptyState, ListSkeleton } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { ActivityType, Badge, EvaluationElementsByPhase, RankedStudent, Session } from "@/lib/api/types";
import { percent } from "@/lib/format";
import { S } from "@/lib/strings";

type Action = "behaviour" | "elements" | "badges" | null;

// Select students, then give them a behaviour, an evaluation degree or a
// badge in one go (session_students in the app).

export function SessionStudentsPanel({ session }: { session: Session }) {
  const toast = useToast();
  const students = useApiQuery<RankedStudent[]>(Endpoints.getGroupStudents, { group_id: session.group_id, type: "performance" });
  const [selected, setSelected] = useState<number[]>([]);
  const [action, setAction] = useState<Action>(null);
  const list = [...(students.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const all = list.length > 0 && selected.length === list.length;
  const done = () => {
    toast.show(S.common.savedSuccessfully);
    setAction(null);
    setSelected([]);
  };

  if (students.isPending) return <ListSkeleton />;
  if (!list.length) return <EmptyState icon="users" title={S.attendance.noStudents} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-2">
        <Checkbox label={S.common.all} checked={all} onChange={() => setSelected(all ? [] : list.map((s) => s.id))} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon="trend" disabled={!selected.length} onClick={() => setAction("behaviour")}>
            {S.student.behaviour}
          </Button>
          <Button size="sm" icon="clipboard" variant="outline" disabled={!selected.length} onClick={() => setAction("elements")}>
            {S.evaluation.title}
          </Button>
          <Button size="sm" icon="star" variant="outline" disabled={!selected.length} onClick={() => setAction("badges")}>
            {S.student.badges}
          </Button>
        </div>
      </div>
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
        {list.map((s) => {
          const on = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected((l) => (on ? l.filter((x) => x !== s.id) : [...l, s.id]))}
              className={clsx("flex items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-start", on ? "border-primary bg-primary-soft" : "border-line bg-soft")}
            >
              <span className={clsx("grid size-6 shrink-0 place-items-center rounded-md border-[1.5px]", on ? "border-primary bg-primary text-white" : "border-line-2 bg-white")}>{on && <Icon name="check" className="size-4" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="text-xs text-muted">{S.attendance.performance(percent(s.performance_rate as number))}</span>
              </span>
            </button>
          );
        })}
      </div>
      <BehaviourAction open={action === "behaviour"} onClose={() => setAction(null)} session={session} studentIds={selected} onDone={done} />
      <ElementsAction open={action === "elements"} onClose={() => setAction(null)} session={session} studentIds={selected} onDone={done} />
      <BadgeAction open={action === "badges"} onClose={() => setAction(null)} session={session} studentIds={selected} onDone={done} />
    </div>
  );
}

type ActionProps = { open: boolean; onClose: () => void; session: Session; studentIds: number[]; onDone: () => void };

function BehaviourAction({ open, onClose, session, studentIds, onDone }: ActionProps) {
  const toast = useToast();
  const types = useApiQuery<ActivityType[]>(Endpoints.classSessionActivityTypes, undefined, { enabled: open, staleTime: Infinity });
  const [tone, setTone] = useState<"positive" | "negative">("positive");
  const add = useApiMutation(Endpoints.classSessionActivityAddMultiple, { invalidates: [Endpoints.studentBehaviours, Endpoints.showGroup] });
  return (
    <Dialog open={open} onClose={onClose} title={S.student.behaviour}>
      <div className="flex flex-col gap-4">
        <Tabs
          label={S.student.behaviour}
          value={tone}
          onChange={setTone}
          items={[
            { key: "positive", label: S.student.positive },
            { key: "negative", label: S.student.negative },
          ]}
        />
        {types.isPending && <IndeterminateBar />}
        <div className="grid grid-cols-2 gap-2.5">
          {(types.data ?? [])
            .filter((t) => t.is_positive === (tone === "positive"))
            .map((t) => (
              <button
                key={t.type}
                type="button"
                disabled={add.isPending}
                onClick={() => add.mutate({ session_id: session.id, students_ids: studentIds, type: t.type, is_positive: t.is_positive }, { onSuccess: onDone, onError: toast.error })}
                className={clsx("min-h-14 rounded-2xl px-3 text-sm font-medium", t.is_positive ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink")}
              >
                {t.type}
              </button>
            ))}
        </div>
      </div>
    </Dialog>
  );
}

function ElementsAction({ open, onClose, session, studentIds, onDone }: ActionProps) {
  const toast = useToast();
  const [phase, setPhase] = useState<"1" | "2">("1");
  const [values, setValues] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const elements = useApiQuery<EvaluationElementsByPhase>(Endpoints.evaluationElementsGroup, { group_id: session.group_id }, { enabled: open });
  const add = useApiMutation(Endpoints.evaluationElementsAddDegreeMultiple, { invalidates: [Endpoints.evaluationElementsStudentGroups, Endpoints.showGroup] });
  const list = elements.data?.[phase === "1" ? "phase_1" : "phase_2"] ?? [];

  async function submit() {
    const filled = list.filter((e) => (values[e.id] ?? "") !== "");
    for (const e of filled) {
      const v = Number(values[e.id]);
      if (!Number.isFinite(v) || v < 0 || v > e.max_degree) {
        setError(`${e.name}: ${S.errors.gradeOutOfRange(e.max_degree)}`);
        return;
      }
    }
    if (!filled.length) {
      setError(S.assessments.noGrades);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // One request per element, in order; stops at the first failure.
      for (const e of filled) await add.mutateAsync({ group_id: session.group_id, evaluation_element_id: e.id, degree: Number(values[e.id]), phase: Number(phase), students_ids: studentIds });
      setValues({});
      onDone();
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={S.evaluation.title}
      footer={
        <Button loading={saving} onClick={submit}>
          {S.evaluation.saveDegrees}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Tabs
          label={S.evaluation.periods}
          value={phase}
          onChange={setPhase}
          items={[
            { key: "1", label: S.common.period1 },
            { key: "2", label: S.common.period2 },
          ]}
        />
        {elements.isPending && <IndeterminateBar />}
        {list.map((e) => (
          <TextField key={e.id} label={`${e.name} (${S.classroom.degrees(e.max_degree)})`} inputMode="decimal" value={values[e.id] ?? ""} onChange={(ev) => setValues({ ...values, [e.id]: ev.target.value.replace(/[^\d.]/g, "") })} />
        ))}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}

function BadgeAction({ open, onClose, session, studentIds, onDone }: ActionProps) {
  const toast = useToast();
  const badges = useApiQuery<Badge[]>(Endpoints.teacherBadges, undefined, { enabled: open, staleTime: Infinity });
  const [badgeId, setBadgeId] = useState<number | null>(null);
  const assign = useApiMutation(Endpoints.teacherBadgesAssignMultipleStudents, { invalidates: [Endpoints.getStudent] });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={S.student.badges}
      footer={
        <Button disabled={!badgeId} loading={assign.isPending} onClick={() => badgeId && assign.mutate({ badge_id: badgeId, session_id: session.id, student_ids: studentIds }, { onSuccess: onDone, onError: toast.error })}>
          {S.common.confirm}
        </Button>
      }
    >
      {badges.isPending ? (
        <IndeterminateBar />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {(badges.data ?? []).map((b) => (
            <Card key={b.id} className={clsx("cursor-pointer p-0", badgeId === b.id && "border-primary bg-primary-soft")}>
              <button type="button" aria-pressed={badgeId === b.id} onClick={() => setBadgeId(b.id)} className="flex w-full flex-col items-center gap-2 p-4">
                <span className="grid size-12 place-items-center rounded-full bg-warning-soft text-warning-ink">
                  <Icon name="star" />
                </span>
                <span className="text-sm">{b.name}</span>
              </button>
            </Card>
          ))}
        </div>
      )}
    </Dialog>
  );
}
