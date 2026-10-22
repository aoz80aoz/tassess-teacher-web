"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation } from "@/lib/api/hooks";
import type { Question } from "@/lib/api/types";
import { S } from "@/lib/strings";

// One student answers the session's questions against the clock. The live
// API requires the totals positive_points / negative_points (the app's
// format); the per-question list from Postman is sent along with them.

const SECONDS_PER_QUESTION = 60;

export function QuizDialog({ open, onClose, sessionId, questions, students }: { open: boolean; onClose: () => void; sessionId: number; questions: Question[]; students: { id: number; name: string }[] }) {
  const toast = useToast();
  const [studentId, setStudentId] = useState("");
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const [left, setLeft] = useState(questions.length * SECONDS_PER_QUESTION);
  const save = useApiMutation(Endpoints.addStudentQuestions, { invalidates: [Endpoints.studentBehaviours, Endpoints.getStudent, Endpoints.showGroup] });

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStarted(false);
    setIndex(0);
    setAnswers({});
    setFinished(false);
    setLeft(questions.length * SECONDS_PER_QUESTION);
  }, [open, questions.length]);

  useEffect(() => {
    if (!started || finished) return;
    if (left <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFinished(true);
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, finished, left]);

  const chosen = studentId || String(students[0]?.id ?? "");
  const q = questions[index];
  const correct = questions.filter((x) => answers[x.id] === x.correct_answer);
  const answered = questions
    .filter((x) => answers[x.id] !== undefined)
    .map((x) => ({ question_id: x.id, positive_points: answers[x.id] === x.correct_answer ? 1 : 0, negative_points: answers[x.id] === x.correct_answer ? 0 : 1 }));

  return (
    <Dialog open={open} onClose={onClose} title={S.run.quizTitle} size="lg">
      {!started ? (
        <div className="flex flex-col gap-4">
          <Select label={S.run.quizTaker} value={chosen} onChange={(e) => setStudentId(e.target.value)}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <p className="text-sm text-muted">{S.run.quizSub(questions.length)}</p>
          <Button icon="play" disabled={!questions.length || !chosen} onClick={() => setStarted(true)}>
            {S.run.quizStart}
          </Button>
        </div>
      ) : finished ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="text-5xl font-bold text-primary">
            {correct.length}/{questions.length}
          </div>
          <p className="text-lg">{S.run.quizResult(correct.length, questions.length)}</p>
          <Button
            icon="save"
            loading={save.isPending}
            disabled={answered.length === 0}
            onClick={() =>
              save.mutate(
                {
                  student_id: Number(chosen),
                  session_id: sessionId,
                  positive_points: answered.reduce((n, a) => n + a.positive_points, 0),
                  negative_points: answered.reduce((n, a) => n + a.negative_points, 0),
                  questions: answered,
                },
                {
                  onSuccess: () => {
                    toast.show(S.run.quizSaved);
                    onClose();
                  },
                  onError: toast.error,
                },
              )
            }
          >
            {S.run.quizSave}
          </Button>
        </div>
      ) : (
        q && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{S.run.questionOf(index + 1, questions.length)}</span>
              <span className={clsx("font-bold", left < questions.length * SECONDS_PER_QUESTION * 0.3 && "text-danger")} dir="ltr">
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
              </span>
            </div>
            <ProgressBar value={((index + 1) / questions.length) * 100} color="var(--color-accent)" height={6} />
            <h3 className="text-2xl font-bold leading-relaxed" dir={q.is_rtl === 0 ? "ltr" : "rtl"}>
              {q.question_text}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {q.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setAnswers({ ...answers, [q.id]: o.id })}
                  className={clsx("min-h-15 rounded-2xl border-[1.5px] px-4 text-start text-lg", answers[q.id] === o.id ? "border-primary bg-primary-soft font-semibold" : "border-line bg-white hover:border-primary")}
                >
                  {o.content}
                </button>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="soft" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                {S.common.previous}
              </Button>
              {index < questions.length - 1 ? (
                <Button onClick={() => setIndex((i) => i + 1)}>{S.common.next}</Button>
              ) : (
                <Button variant="accent" onClick={() => setFinished(true)}>
                  {S.run.quizFinish}
                </Button>
              )}
            </div>
          </div>
        )
      )}
    </Dialog>
  );
}
