"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox, TextArea, TextField } from "@/components/ui/Field";
import { IndeterminateBar } from "@/components/ui/Progress";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { api, toFormData } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { AssessmentCategory, Exam, Question, Unit } from "@/lib/api/types";
import { currentHijriYear, fileSize, fromDateTimeInput, toDateTimeInput, toRequestDateTime } from "@/lib/format";
import { S } from "@/lib/strings";

// Exams (classroom) and homework (session) share one flow, like the app's
// `assessments` feature: from a file, or from the Taseese question bank.

const MAX_FILE = 2 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,image/*";

const blankForm = () => ({
  title: "",
  description: "",
  total: "",
  deadline: toDateTimeInput(defaultDeadline()),
  duration: "30",
  hijriYear: String(currentHijriYear()),
  cycleName: "",
  closingWords: S.assessments.defaultClosingWords as string,
});

function defaultDeadline() {
  const d = new Date(Date.now() + 3 * 86_400_000);
  d.setHours(23, 59, 0, 0);
  return d;
}

export function AddAssessmentDialog({
  open,
  onClose,
  classroomId,
  category,
  sessionId,
  lessonId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  classroomId: number;
  category: AssessmentCategory;
  sessionId?: number;
  lessonId?: number | null;
  onCreated?: (exam: Exam) => void;
}) {
  const toast = useToast();
  const [source, setSource] = useState<"file" | "taseese">("file");
  const [form, setForm] = useState(blankForm);
  const [file, setFile] = useState<File | null>(null);
  const [lessons, setLessons] = useState<number[]>(lessonId ? [lessonId] : []);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const units = useApiQuery<Unit[]>(Endpoints.classSessionUnitsAndLessons, { group_id: classroomId }, { enabled: open && source === "taseese", staleTime: 10 * 60_000 });
  const invalidates = [Endpoints.groupExams, Endpoints.showGroup, Endpoints.studentExams];
  const fromFile = useApiMutation<Exam | null, FormData>(Endpoints.groupExamCreate, { invalidates });
  const fromTaseese = useApiMutation<Exam | null>(Endpoints.createExamFromTasseese, { invalidates });

  useEffect(() => {
    if (!open) return;
    // Fresh form each time the dialog opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(blankForm());
    setFile(null);
    setLessons(lessonId ? [lessonId] : []);
    setQuestions(null);
    setErrors({});
  }, [open, lessonId]);

  // Questions are reloaded whenever the lesson choice changes; a stale
  // answer for an older choice is ignored.
  useEffect(() => {
    if (source !== "taseese" || lessons.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuestions(null);
      return;
    }
    let live = true;
    setLoadingQuestions(true);
    api<Question[]>(Endpoints.questionsByMultipleLessons, { lessons_ids: lessons, count_questions: 50 })
      .then((q) => live && setQuestions(q))
      .catch((e) => live && toast.error(e))
      .finally(() => live && setLoadingQuestions(false));
    return () => {
      live = false;
    };
  }, [lessons, source, toast]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const deadline = fromDateTimeInput(form.deadline);
    if (!deadline) next.deadline = S.errors.required;
    else if (deadline.getTime() <= Date.now()) next.deadline = S.errors.deadlineInPast;
    if (source === "file") {
      if (!form.title.trim()) next.title = S.errors.required;
      const total = Number(form.total);
      if (!Number.isInteger(total) || total <= 0) next.total = S.errors.invalidNumber;
      if (file && file.size > MAX_FILE) next.file = `${fileSize(file.size)} > 2 MB`;
    } else {
      if (!questions?.length) next.lessons = S.errors.required;
      else if (questions.length > 50) next.lessons = S.assessments.tooManyQuestions;
      const year = Number(form.hijriYear);
      if (!Number.isInteger(year) || year < 1400 || year > 1500) next.hijriYear = S.assessments.hijriYearRange;
      if (!form.cycleName.trim()) next.cycleName = S.errors.required;
      if (!form.closingWords.trim()) next.closingWords = S.errors.required;
      const minutes = Number(form.duration);
      if (category === "exam" && form.duration && (!Number.isInteger(minutes) || minutes < 10 || minutes > 240)) next.duration = S.assessments.durationRange;
    }
    setErrors(next);
    if (Object.keys(next).length || !deadline) return;

    const done = {
      // The API answers the create calls with data: null; only a returned exam is opened.
      onSuccess: (exam: Exam | null) => {
        toast.show(S.assessments.created);
        onClose();
        if (exam?.id) onCreated?.(exam);
      },
      onError: toast.error,
    };
    if (source === "file") {
      fromFile.mutate(
        toFormData({
          group_id: classroomId,
          session_id: sessionId,
          category,
          title: form.title.trim(),
          description: form.description || undefined,
          total_marks: Number(form.total),
          deadline: toRequestDateTime(deadline),
          file: file ?? undefined,
        }),
        done,
      );
    } else {
      // The Postman "Create From Tasseese" body: no title; closing words,
      // Hijri year and cycle name are required.
      fromTaseese.mutate(
        {
          group_id: classroomId,
          session_id: sessionId,
          deadline: toRequestDateTime(deadline),
          description: form.description || undefined,
          type: "electronic",
          category,
          questions_ids: questions!.map((q) => q.id),
          // Homework has no duration (same as the app).
          time: category === "exam" && form.duration ? Number(form.duration) : undefined,
          closing_words: form.closingWords.trim(),
          hijri_year: form.hijriYear,
          cycle_name: form.cycleName.trim(),
        },
        done,
      );
    }
  }

  const title = category === "exam" ? S.assessments.addExam : S.assessments.addHomework;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button type="submit" form="assessment-form" loading={fromFile.isPending || fromTaseese.isPending}>
            {S.common.create}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      <form id="assessment-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Tabs
          label={title}
          value={source}
          onChange={setSource}
          items={[
            { key: "file", label: S.assessments.fromFile },
            { key: "taseese", label: S.assessments.fromTaseese },
          ]}
          className="self-start"
        />
        {source === "file" ? (
          <TextField label={S.assessments.titleLabel} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={errors.title} autoFocus />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={S.assessments.cycleName} placeholder={S.assessments.cyclePlaceholder} value={form.cycleName} onChange={(e) => setForm({ ...form, cycleName: e.target.value })} error={errors.cycleName} autoFocus />
            <TextField label={S.assessments.hijriYear} inputMode="numeric" value={form.hijriYear} onChange={(e) => setForm({ ...form, hijriYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} error={errors.hijriYear} />
          </div>
        )}
        <TextArea label={`${S.assessments.description} (${S.common.optional})`} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={S.assessments.deadline} type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} error={errors.deadline} />
          {source === "file" ? (
            <TextField label={S.assessments.totalMarks} inputMode="numeric" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value.replace(/\D/g, "") })} error={errors.total} />
          ) : (
            category === "exam" && <TextField label={`${S.assessments.duration} (${S.common.optional})`} inputMode="numeric" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value.replace(/\D/g, "") })} error={errors.duration} />
          )}
        </div>
        {source === "file" ? (
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-line-2 p-6 text-center hover:border-primary">
            <span className="font-semibold">{file ? file.name : S.assessments.file}</span>
            {file && <span className="text-sm text-muted">{fileSize(file.size)}</span>}
            {errors.file && <span className="text-sm text-danger">{errors.file}</span>}
            <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <>
            <TextField label={S.assessments.closingWords} value={form.closingWords} onChange={(e) => setForm({ ...form, closingWords: e.target.value })} error={errors.closingWords} />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-ink-2">{S.assessments.lessons}</legend>
              {units.isPending && <IndeterminateBar />}
              <div className="flex max-h-64 flex-col gap-3 overflow-y-auto rounded-2xl border border-line p-3">
                {(units.data ?? []).map((u) => (
                  <div key={u.id}>
                    <div className="mb-1 text-sm font-semibold text-muted">{u.name}</div>
                    {u.lessons.map((l) => (
                      <Checkbox
                        key={l.id}
                        label={l.name}
                        checked={lessons.includes(l.id)}
                        onChange={(e) => setLessons((list) => (e.target.checked ? [...list, l.id] : list.filter((x) => x !== l.id)))}
                        className="flex"
                      />
                    ))}
                  </div>
                ))}
              </div>
              {loadingQuestions ? <IndeterminateBar /> : questions && <span className="text-sm text-muted">{S.assessments.questionsFound(questions.length)}</span>}
              {errors.lessons && <span className="text-sm text-danger">{errors.lessons}</span>}
            </fieldset>
          </>
        )}
      </form>
    </Dialog>
  );
}
