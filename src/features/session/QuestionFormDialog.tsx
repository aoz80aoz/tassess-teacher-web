"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextArea, TextField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation } from "@/lib/api/hooks";
import type { Question } from "@/lib/api/types";
import { S } from "@/lib/strings";

type Kind = "multiple_choice" | "true_false";

export function QuestionFormDialog({ open, onClose, onSaved, sessionId, question }: { open: boolean; onClose: () => void; onSaved?: () => void; sessionId: number; question?: Question | null }) {
  const toast = useToast();
  const blank = () => ({
    text: question?.question_text ?? "",
    kind: (question?.question_type ?? "multiple_choice") as Kind,
    options: question?.question_type === "multiple_choice" ? question.options.map((o) => o.content) : ["", "", "", ""],
    correct: question ? question.correct_answer : 1,
    explanation: question?.explanation ?? "",
    degree: question?.degree != null ? String(question.degree) : "",
    points: question ? String(Number(question.points)) : "",
  });
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const invalidates = [Endpoints.classSessionQuestions, Endpoints.classSessionShow];
  const create = useApiMutation(Endpoints.classSessionQuestionsCreate, { invalidates });
  const update = useApiMutation(Endpoints.classSessionQuestionsUpdate, { invalidates });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setForm(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const filled = form.options.map((o) => o.trim());
    if (!form.text.trim()) next.text = S.errors.required;
    if (form.kind === "multiple_choice" && filled.filter(Boolean).length < 2) next.options = S.errors.required;
    if (form.kind === "multiple_choice" && !filled[form.correct - 1]) next.options = S.prep.correctAnswer;
    for (const key of ["degree", "points"] as const) {
      const v = Number(form[key]);
      if (!Number.isInteger(v) || v <= 0) next[key] = S.errors.invalidNumber;
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    // Empty options are dropped and the correct answer renumbered.
    const kept = filled.map((content, i) => ({ content, i })).filter((o) => o.content);
    const correct = form.kind === "true_false" ? form.correct : kept.findIndex((o) => o.i === form.correct - 1) + 1;
    const body = {
      ...(question ? { question_id: question.id } : { session_id: sessionId }),
      question_text: form.text.trim(),
      question_type: form.kind,
      options: form.kind === "true_false" ? [{ type: "text", content: S.prep.trueLabel }, { type: "text", content: S.prep.falseLabel }] : kept.map((o) => ({ type: "text", content: o.content })),
      correct_answer: correct,
      explanation: form.explanation || null,
      degree: Number(form.degree),
      points: Number(form.points),
      question_image: null,
    };
    (question ? update : create).mutate(body, {
      onSuccess: () => {
        toast.show(S.common.savedSuccessfully);
        onSaved?.();
        onClose();
      },
      onError: toast.error,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={question ? S.prep.questionFormEdit : S.prep.questionFormAdd}
      footer={
        <>
          <Button type="submit" form="question-form" loading={create.isPending || update.isPending}>
            {S.common.save}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      <form id="question-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-2">{S.prep.questionType}</span>
          <Segmented
            label={S.prep.questionType}
            value={form.kind}
            onChange={(kind) => setForm({ ...form, kind, correct: 1 })}
            options={[
              { key: "multiple_choice", label: S.prep.multipleChoice, activeClass: "bg-primary" },
              { key: "true_false", label: S.prep.trueFalse, activeClass: "bg-primary" },
            ]}
          />
        </div>
        <TextArea label={S.prep.questionText} rows={2} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} error={errors.text} autoFocus />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-ink-2">{S.prep.correctAnswer}</legend>
          {(form.kind === "true_false" ? [S.prep.trueLabel, S.prep.falseLabel] : form.options).map((value, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <input type="radio" name="correct" className="size-5 accent-success" checked={form.correct === i + 1} onChange={() => setForm({ ...form, correct: i + 1 })} aria-label={`${S.prep.correctAnswer} ${S.prep.option(i + 1)}`} />
              {form.kind === "true_false" ? (
                <span className="min-h-11 flex-1 content-center rounded-xl bg-surface px-3.5">{value}</span>
              ) : (
                <>
                  <input
                    value={value}
                    placeholder={S.prep.option(i + 1)}
                    aria-label={S.prep.option(i + 1)}
                    onChange={(e) => setForm({ ...form, options: form.options.map((o, k) => (k === i ? e.target.value : o)) })}
                    className="min-h-11 flex-1 rounded-xl border-[1.5px] border-line px-3.5 outline-none focus:border-primary"
                  />
                  {form.options.length > 2 && (
                    <IconButton
                      icon="close"
                      label={S.prep.removeOption}
                      onClick={() => setForm({ ...form, options: form.options.filter((_, k) => k !== i), correct: form.correct > i + 1 ? form.correct - 1 : form.correct === i + 1 ? 1 : form.correct })}
                    />
                  )}
                </>
              )}
            </div>
          ))}
          {form.kind === "multiple_choice" && form.options.length < 6 && (
            <Button variant="ghost" size="sm" icon="plus" className="self-start" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>
              {S.prep.addOption}
            </Button>
          )}
          {errors.options && <p className="text-sm text-danger">{errors.options}</p>}
        </fieldset>
        <TextArea label={`${S.prep.explanation} (${S.common.optional})`} rows={2} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label={S.prep.degreeLabel} inputMode="numeric" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value.replace(/\D/g, "") })} error={errors.degree} />
          <TextField label={S.prep.pointsLabel} inputMode="numeric" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value.replace(/\D/g, "") })} error={errors.points} />
        </div>
      </form>
    </Dialog>
  );
}
