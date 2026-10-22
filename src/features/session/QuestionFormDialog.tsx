"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextArea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { toFormData, type ApiBody } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation } from "@/lib/api/hooks";
import type { Question } from "@/lib/api/types";
import { fileSize } from "@/lib/format";
import { fileUrl } from "@/lib/site";
import { S } from "@/lib/strings";

const MAX_IMAGE = 2 * 1024 * 1024;

// The Postman body: question_text, question_image, correct_answer (the id
// of the right option) and options [{ id, type, content }].
export function QuestionFormDialog({ open, onClose, onSaved, sessionId, question }: { open: boolean; onClose: () => void; onSaved?: () => void; sessionId: number; question?: Question | null }) {
  const toast = useToast();
  const blank = () => {
    const options = question ? question.options.map((o) => o.content) : ["", "", "", ""];
    const correct = question ? Math.max(1, question.options.findIndex((o) => o.id === question.correct_answer) + 1) : 1;
    return { text: question?.question_text ?? "", options, correct };
  };
  const [form, setForm] = useState(blank);
  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const invalidates = [Endpoints.classSessionQuestions, Endpoints.classSessionShow];
  const create = useApiMutation<unknown, ApiBody>(Endpoints.classSessionQuestionsCreate, { invalidates });
  const update = useApiMutation<unknown, ApiBody>(Endpoints.classSessionQuestionsUpdate, { invalidates });

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(blank());
    setImage(null);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const filled = form.options.map((o) => o.trim());
    if (!form.text.trim()) next.text = S.errors.required;
    if (filled.filter(Boolean).length < 2) next.options = S.errors.required;
    else if (!filled[form.correct - 1]) next.options = S.prep.correctAnswer;
    if (image && image.size > MAX_IMAGE) next.image = `${fileSize(image.size)} > 2 MB`;
    setErrors(next);
    if (Object.keys(next).length) return;
    // Empty options are dropped; ids are 1..n and the answer points at one.
    const kept = filled.map((content, i) => ({ content, i })).filter((o) => o.content);
    const body = {
      ...(question ? { question_id: question.id } : { session_id: sessionId }),
      question_text: form.text.trim(),
      correct_answer: kept.findIndex((o) => o.i === form.correct - 1) + 1,
      options: kept.map((o, k) => ({ id: k + 1, type: "text", content: o.content })),
    };
    // JSON like Postman; multipart only when an image file goes along.
    (question ? update : create).mutate(image ? toFormData({ ...body, question_image: image }) : body, {
      onSuccess: () => {
        toast.show(S.common.savedSuccessfully);
        onSaved?.();
        onClose();
      },
      onError: toast.error,
    });
  }

  const currentImage = fileUrl(question?.question_image);

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
        <TextArea label={S.prep.questionText} rows={2} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} error={errors.text} autoFocus />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-2">
            {S.prep.questionImage} ({S.common.optional})
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {!image && currentImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentImage} alt="" className="h-16 rounded-lg object-cover" />
            )}
            <label className="cursor-pointer rounded-xl border-[1.5px] border-line px-4 py-2.5 text-sm font-semibold text-primary hover:border-primary">
              {image ? image.name : S.prep.chooseImage}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            </label>
            {image && (
              <button type="button" className="min-h-11 text-sm text-danger" onClick={() => setImage(null)}>
                {S.common.delete}
              </button>
            )}
          </div>
          {errors.image && <p className="text-sm text-danger">{errors.image}</p>}
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-ink-2">{S.prep.correctAnswer}</legend>
          {form.options.map((value, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <input type="radio" name="correct" className="size-5 accent-success" checked={form.correct === i + 1} onChange={() => setForm({ ...form, correct: i + 1 })} aria-label={`${S.prep.correctAnswer} ${S.prep.option(i + 1)}`} />
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
            </div>
          ))}
          {form.options.length < 6 && (
            <Button variant="ghost" size="sm" icon="plus" className="self-start" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>
              {S.prep.addOption}
            </Button>
          )}
          {errors.options && <p className="text-sm text-danger">{errors.options}</p>}
        </fieldset>
      </form>
    </Dialog>
  );
}
