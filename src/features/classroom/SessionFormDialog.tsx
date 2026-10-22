"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select, TextArea, TextField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { Session, Unit } from "@/lib/api/types";
import { fromDateTimeInput, toDateTimeInput, toRequestDateTime } from "@/lib/format";
import { S } from "@/lib/strings";

// API values (wire contract, not display text): the backend stores the
// session type as these exact words (SessionType in the app).
const TYPE_NEW = "درس جديد";
const TYPE_REVIEW = "مراجعة";

function defaultStart() {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d;
}

export function SessionFormDialog({
  open,
  onClose,
  classroomId,
  session,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  classroomId: number;
  session?: Session;
  onSaved?: (session: Session) => void;
}) {
  const toast = useToast();
  const units = useApiQuery<Unit[]>(Endpoints.classSessionUnitsAndLessons, { group_id: classroomId }, { enabled: open, staleTime: 10 * 60_000 });
  const blank = () => ({
    name: session?.name ?? "",
    type: session?.type === TYPE_REVIEW ? TYPE_REVIEW : TYPE_NEW,
    grouping: (session?.grouping_method ?? "kagan") as "kagan" | "random",
    unitId: "",
    lessonId: session?.lesson_id ? String(session.lesson_id) : "",
    startsAt: toDateTimeInput(session?.starts_at ?? defaultStart()),
    duration: String(session?.duration_minutes ?? 45),
    objectives: session?.lesson_objectives ?? "",
    outcomes: session?.educational_outcome ?? "",
    prep: session?.preparation_text ?? "",
  });
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Reset when the dialog opens, so a cancelled edit doesn't linger.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setForm(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Find the unit of the edited session's lesson once units load.
  const allLessons = (units.data ?? []).flatMap((u) => u.lessons.map((l) => ({ ...l, unitName: u.name })));
  const unitId = form.unitId || String(allLessons.find((l) => String(l.id) === form.lessonId)?.unit_id ?? "");
  const lessons = (units.data ?? []).find((u) => String(u.id) === unitId)?.lessons ?? [];

  const mutation = useApiMutation<Session>(session ? Endpoints.classSessionUpdate : Endpoints.classSessionCreate, {
    invalidates: [Endpoints.showGroup, Endpoints.classSessionShow, Endpoints.home],
  });

  function pickLesson(id: string) {
    const lesson = allLessons.find((l) => String(l.id) === id);
    setForm((f) => ({
      ...f,
      lessonId: id,
      // Fill the texts from the curriculum, without overwriting what the teacher typed.
      objectives: f.objectives || lesson?.objectives || "",
      outcomes: f.outcomes || lesson?.outcomes || "",
      prep: f.prep || lesson?.teaching_steps || "",
    }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const start = fromDateTimeInput(form.startsAt);
    const duration = Number(form.duration);
    if (!form.name.trim()) next.name = S.errors.required;
    if (!start) next.startsAt = S.errors.required;
    else if (start.getTime() <= Date.now()) next.startsAt = S.errors.sessionInPast;
    if (!Number.isInteger(duration) || duration < 5 || duration > 240) next.duration = S.errors.invalidNumber;
    setErrors(next);
    if (Object.keys(next).length || !start) return;
    const lesson = allLessons.find((l) => String(l.id) === form.lessonId);
    mutation.mutate(
      {
        ...(session ? { session_id: session.id } : { group_id: classroomId }),
        name: form.name.trim(),
        type: form.type,
        grouping_method: form.grouping,
        unit_name: lesson?.unitName ?? session?.unit_name ?? "",
        lesson_name: lesson?.name ?? session?.lesson_name ?? "",
        lesson_id: lesson?.id ?? "",
        starts_at: toRequestDateTime(start),
        duration_minutes: duration,
        lesson_objectives: form.objectives,
        educational_outcome: form.outcomes,
        preparation_text: form.prep,
      },
      {
        onSuccess: (saved) => {
          toast.show(S.common.savedSuccessfully);
          onClose();
          onSaved?.(saved);
        },
        onError: toast.error,
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={session ? S.session.editTitle : S.session.addTitle}
      footer={
        <>
          <Button type="submit" form="session-form" loading={mutation.isPending}>
            {S.common.save}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      <form id="session-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextField wrapperClassName="sm:col-span-2" label={S.session.name} placeholder={S.session.namePlaceholder} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} autoFocus />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-2">{S.session.type}</span>
          <Segmented
            label={S.session.type}
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v })}
            options={[
              { key: TYPE_NEW, label: S.session.typeNew, activeClass: "bg-primary" },
              { key: TYPE_REVIEW, label: S.session.typeReview, activeClass: "bg-primary" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-2">{S.session.grouping}</span>
          <Segmented
            label={S.session.grouping}
            value={form.grouping}
            onChange={(v) => setForm({ ...form, grouping: v })}
            options={[
              { key: "kagan", label: S.session.kagan, activeClass: "bg-primary" },
              { key: "random", label: S.session.random, activeClass: "bg-primary" },
            ]}
          />
        </div>
        <Select label={S.session.unit} value={unitId} disabled={units.isPending} onChange={(e) => setForm({ ...form, unitId: e.target.value, lessonId: "" })}>
          <option value="">{S.common.selectPlaceholder}</option>
          {(units.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select label={S.session.lesson} value={form.lessonId} disabled={!unitId} onChange={(e) => pickLesson(e.target.value)}>
          <option value="">{S.common.selectPlaceholder}</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <TextField label={S.session.startsAt} type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} error={errors.startsAt} />
        <TextField label={S.session.duration} inputMode="numeric" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value.replace(/\D/g, "") })} error={errors.duration} />
        <TextArea wrapperClassName="sm:col-span-2" label={S.session.objectives} rows={3} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} />
        <TextArea label={S.session.outcomes} rows={3} value={form.outcomes} onChange={(e) => setForm({ ...form, outcomes: e.target.value })} />
        <TextArea label={S.session.prepText} rows={3} value={form.prep} onChange={(e) => setForm({ ...form, prep: e.target.value })} />
      </form>
    </Dialog>
  );
}
