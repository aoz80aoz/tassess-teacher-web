"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { IndeterminateBar, ProgressBar } from "@/components/ui/Progress";
import { ErrorState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { ActivityType, Badge, LearningPattern, Session, StudentEvaluation, TaseeseReport } from "@/lib/api/types";
import { percent } from "@/lib/format";
import { S } from "@/lib/strings";

type Base = { open: boolean; onClose: () => void; classroomId: number; studentId: number };

export function DegreesDialog({ open, onClose, classroomId, studentId }: Base) {
  const toast = useToast();
  const [phase, setPhase] = useState<1 | 2>(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const query = useApiQuery<StudentEvaluation>(Endpoints.evaluationElementsStudentGroups, { group_id: classroomId, student_id: studentId }, { enabled: open });
  const save = useApiMutation(Endpoints.evaluationElementsAddStudentDegrees, { invalidates: [Endpoints.evaluationElementsStudentGroups, Endpoints.getStudent, Endpoints.showGroup] });
  const elements = query.data?.[phase === 1 ? "phase_1" : "phase_2"] ?? [];

  useEffect(() => {
    if (!query.data) return;
    const seed: Record<string, string> = {};
    for (const p of [1, 2] as const) for (const e of query.data[p === 1 ? "phase_1" : "phase_2"]) seed[`${p}:${e.id}`] = e.degree == null ? "" : String(e.degree);
    // Seed the form from the loaded degrees.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(seed);
  }, [query.data]);

  function submit() {
    const degrees = [];
    for (const e of elements) {
      const raw = values[`${phase}:${e.id}`] ?? "";
      if (raw === "") continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > e.max_degree) {
        setError(`${e.name}: ${S.errors.gradeOutOfRange(e.max_degree)}`);
        return;
      }
      degrees.push({ evaluation_element_id: e.id, degree: v });
    }
    setError(null);
    save.mutate(
      { group_id: classroomId, student_id: studentId, phase, degrees },
      {
        onSuccess: () => {
          toast.show(S.student.degreesSaved);
          onClose();
        },
        onError: (e) => setError(e.message),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={S.student.degreesTitle}
      footer={
        <>
          <Button onClick={submit} loading={save.isPending} disabled={!elements.length}>
            {S.evaluation.saveDegrees}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Tabs
          label={S.evaluation.periods}
          value={String(phase) as "1" | "2"}
          onChange={(v) => setPhase(Number(v) as 1 | 2)}
          items={[
            { key: "1", label: S.common.period1 },
            { key: "2", label: S.common.period2 },
          ]}
        />
        {query.isPending && <IndeterminateBar />}
        {query.error && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
        {query.data && elements.length === 0 && <p className="py-4 text-center text-muted">{S.classroom.noElements}</p>}
        {elements.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-4 rounded-xl bg-surface px-4 py-2.5">
            <span>{e.name}</span>
            <div className="flex items-center gap-2">
              <input
                inputMode="decimal"
                aria-label={`${e.name} ${S.evaluation.degree}`}
                value={values[`${phase}:${e.id}`] ?? ""}
                onChange={(ev) => setValues({ ...values, [`${phase}:${e.id}`]: ev.target.value.replace(/[^\d.]/g, "") })}
                className="h-10 w-20 rounded-[10px] border-[1.5px] border-line-2 bg-white text-center font-semibold outline-none focus:border-primary"
              />
              <span className="text-sm text-muted">/ {e.max_degree}</span>
            </div>
          </div>
        ))}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

function SelectionGrid<T extends { id: number; name: string }>({ items, selected, onToggle }: { items: T[]; selected: number[]; onToggle: (id: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const on = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(item.id)}
            className={clsx("flex flex-col items-center gap-2 rounded-2xl border-[1.5px] p-4 text-center", on ? "border-primary bg-primary-soft" : "border-line bg-white hover:border-primary")}
          >
            <span className={clsx("grid size-12 place-items-center rounded-full", on ? "bg-primary text-white" : "bg-warning-soft text-warning-ink")}>
              <Icon name={on ? "check" : "star"} />
            </span>
            <span className="text-sm font-medium">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function BadgesDialog({ open, onClose, classroomId, studentId, current }: Base & { current: Badge[] }) {
  const toast = useToast();
  const catalog = useApiQuery<Badge[]>(Endpoints.teacherBadges, undefined, { enabled: open, staleTime: Infinity });
  const [selected, setSelected] = useState<number[]>([]);
  const save = useApiMutation(Endpoints.teacherBadgesUpdateStudent, { invalidates: [Endpoints.getStudent] });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setSelected(current.map((b) => b.id));
  }, [open, current]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={S.student.badges}
      footer={
        <>
          <Button
            loading={save.isPending}
            onClick={() =>
              save.mutate(
                { group_id: classroomId, student_id: studentId, badge_ids: selected },
                {
                  onSuccess: () => {
                    toast.show(S.common.savedSuccessfully);
                    onClose();
                  },
                  onError: toast.error,
                },
              )
            }
          >
            {S.common.save}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      {catalog.isPending ? <IndeterminateBar /> : <SelectionGrid items={catalog.data ?? []} selected={selected} onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} />}
    </Dialog>
  );
}

export function PatternsDialog({ open, onClose, classroomId, studentId, current }: Base & { current: LearningPattern[] }) {
  const toast = useToast();
  const catalog = useApiQuery<LearningPattern[]>(Endpoints.teacherLearningPatterns, undefined, { enabled: open, staleTime: Infinity });
  const [selected, setSelected] = useState<number[]>([]);
  const save = useApiMutation(Endpoints.teacherLearningPatternsUpdateStudent, { invalidates: [Endpoints.getStudent, Endpoints.showGroup] });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setSelected(current.map((p) => p.id));
  }, [open, current]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={S.student.patterns}
      footer={
        <>
          <Button
            loading={save.isPending}
            onClick={() =>
              save.mutate(
                { group_id: classroomId, student_id: studentId, patterns: selected },
                {
                  onSuccess: () => {
                    toast.show(S.common.savedSuccessfully);
                    onClose();
                  },
                  onError: toast.error,
                },
              )
            }
          >
            {S.common.save}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      {catalog.isPending ? (
        <IndeterminateBar />
      ) : (
        <div className="flex flex-col gap-2">
          {(catalog.data ?? []).map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => setSelected((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                className={clsx("flex items-start gap-3 rounded-2xl border-[1.5px] p-4 text-start", on ? "border-primary bg-primary-soft" : "border-line bg-white")}
              >
                <span className={clsx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-[1.5px]", on ? "border-primary bg-primary text-white" : "border-line-2")}>{on && <Icon name="check" className="size-4" />}</span>
                <span>
                  <strong className="block">{p.name}</strong>
                  {p.description && <span className="text-sm text-muted">{p.description}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

export function BehaviourDialog({ open, onClose, studentId, sessions }: Omit<Base, "classroomId"> & { sessions: Session[] }) {
  const toast = useToast();
  const types = useApiQuery<ActivityType[]>(Endpoints.classSessionActivityTypes, undefined, { enabled: open, staleTime: Infinity });
  const [tone, setTone] = useState<"positive" | "negative">("positive");
  const usable = sessions.filter((s) => s.status !== "pending");
  const [sessionId, setSessionId] = useState("");
  const add = useApiMutation(Endpoints.classSessionActivityAdd, { invalidates: [Endpoints.studentBehaviours, Endpoints.getStudent, Endpoints.showGroup] });
  const chosen = sessionId || String(usable[0]?.id ?? "");
  const list = (types.data ?? []).filter((t) => t.is_positive === (tone === "positive"));
  return (
    <Dialog open={open} onClose={onClose} title={S.student.addBehaviour}>
      <div className="flex flex-col gap-4">
        <Select label={S.student.chooseSession} value={chosen} onChange={(e) => setSessionId(e.target.value)}>
          {usable.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.lesson_name}
            </option>
          ))}
        </Select>
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
          {list.map((t) => (
            <button
              key={t.type}
              type="button"
              disabled={!chosen || add.isPending}
              onClick={() =>
                add.mutate(
                  { session_id: Number(chosen), student_id: studentId, type: t.type, is_positive: t.is_positive },
                  {
                    onSuccess: () => {
                      toast.show(S.common.addedSuccessfully);
                      onClose();
                    },
                    onError: toast.error,
                  },
                )
              }
              className={clsx("min-h-14 rounded-2xl border-[1.5px] px-3 text-sm font-medium disabled:opacity-50", t.is_positive ? "border-success-soft bg-success-soft text-success-ink" : "border-danger-soft bg-danger-soft text-danger-ink")}
            >
              {t.type}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

export function TaseeseReportDialog({ open, onClose, phone, subjectId }: { open: boolean; onClose: () => void; phone: string; subjectId: number }) {
  const query = useApiQuery<TaseeseReport>(Endpoints.taseeseStudentFullReport, { student_phone: phone, subject_id: subjectId }, { enabled: open });
  const r = query.data;
  const mins = r ? `${Math.floor(r.average_solve_seconds / 60)}:${String(r.average_solve_seconds % 60).padStart(2, "0")}` : "";
  return (
    <Dialog open={open} onClose={onClose} title={S.student.taseeseTitle} size="lg">
      {query.isPending ? (
        <IndeterminateBar />
      ) : query.error || !r ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div className="flex flex-col gap-5">
          <Chip className="self-start">{r.subject_name}</Chip>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [S.student.averageSkills, percent(r.average_skills)],
              [S.student.totalQuestions, String(r.total_questions)],
              [S.student.correctAnswers, String(r.correct_answers)],
              [S.student.solveTime, mins],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-surface p-4">
                <div className="text-sm text-muted">{label}</div>
                <div className="mt-1 text-xl font-bold" dir="ltr">
                  {value}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <strong>{S.student.monthly}</strong>
            {r.months.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm">{m.month}</span>
                <ProgressBar value={m.percentage} />
                <span className="w-12 shrink-0 text-sm font-semibold">{percent(m.percentage)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <strong>{S.student.weakSkills}</strong>
            {r.weak.map((w) => (
              <div key={w.name} className="flex items-center justify-between gap-3 rounded-xl bg-danger-soft px-4 py-2.5 text-danger-ink">
                <span>{w.name}</span>
                <strong>{percent(w.percentage)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}

