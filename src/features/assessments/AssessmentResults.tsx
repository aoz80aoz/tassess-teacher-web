"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { Exam, ExamResults } from "@/lib/api/types";
import { saveCsv, stamp } from "@/lib/download";
import { examTitle, formatDate, formatTime } from "@/lib/format";
import { fileUrl } from "@/lib/site";
import { S } from "@/lib/strings";

const EXAM_LABELS = { exam: S.assessments.kindExam, homework: S.assessments.kindHomework };

export function AssessmentResults({ exam, onDeleted }: { exam: Exam; onDeleted: () => void }) {
  const toast = useToast();
  const query = useApiQuery<ExamResults>(Endpoints.getExamResults, { exam_id: exam.id });
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const total = Number(exam.total_marks);
  const submit = useApiMutation(Endpoints.submitExamResults, { invalidates: [Endpoints.getExamResults, Endpoints.showGroup, Endpoints.studentExams, Endpoints.getStudent] });
  const remove = useApiMutation(Endpoints.groupExamDelete, { invalidates: [Endpoints.groupExams, Endpoints.showGroup] });

  useEffect(() => {
    if (!query.data) return;
    // Seed from the saved marks; a later refetch keeps what the teacher typed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMarks((current) => {
      const next: Record<number, string> = {};
      for (const s of query.data.students) next[s.student_id] = current[s.student_id] ?? (s.student_marks == null ? "" : String(Number(s.student_marks)));
      return next;
    });
  }, [query.data]);

  function save() {
    const results = [];
    for (const [id, raw] of Object.entries(marks)) {
      if (raw === "") continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > total) {
        setError(S.errors.gradeOutOfRange(total));
        return;
      }
      results.push({ student_id: Number(id), student_mark: v });
    }
    if (!results.length) {
      setError(S.assessments.noGrades);
      return;
    }
    setError(null);
    submit.mutate({ exam_id: exam.id, results }, { onSuccess: () => toast.show(S.assessments.gradesSaved), onError: (e) => setError(e.message) });
  }

  const link = exam.web_url ?? fileUrl(exam.file_path);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-4">
        <span className="grid size-15 shrink-0 place-items-center rounded-2xl bg-danger-soft font-bold text-danger-ink">{exam.type === "file" ? S.common.pdf : S.assessments.typeTaseese}</span>
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
          <strong className="text-lg">{examTitle(exam, EXAM_LABELS)}</strong>
          <span className="text-sm text-muted">
            {exam.type === "file" ? S.assessments.fromTeacher : S.assessments.fromTaseeseBank} · {S.assessments.totalOf(String(total))}
          </span>
          <div className="flex flex-wrap gap-2">
            <Chip tone="neutral">{formatDate(exam.deadline)}</Chip>
            <Chip tone="neutral">{formatTime(exam.deadline)}</Chip>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {link && (
            <a href={link} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-primary px-4 font-semibold text-primary hover:bg-primary-soft">
              <Icon name="eye" />
              {S.common.preview}
            </a>
          )}
          {exam.web_url && (
            <Button
              variant="outline"
              icon="share"
              onClick={async () => {
                const url = exam.web_url!;
                if (navigator.share) await navigator.share({ title: examTitle(exam, EXAM_LABELS), url }).catch(() => null);
                else {
                  await navigator.clipboard.writeText(url);
                  toast.show(S.common.copied);
                }
              }}
            >
              {S.assessments.shareLink}
            </Button>
          )}
          <Button
            variant="accent"
            icon="download"
            disabled={!query.data}
            onClick={() =>
              saveCsv(
                [[S.assessments.student, S.assessments.statusCol, S.assessments.gradeOf(String(total))], ...(query.data?.students ?? []).map((s) => [s.student_name, s.is_submitted ? S.assessments.submitted : S.assessments.notSubmitted, marks[s.student_id] ?? ""])],
                `exam_${exam.id}_${stamp()}`,
              )
            }
          >
            {S.assessments.exportGrades}
          </Button>
          <Button variant="danger" icon="trash" onClick={() => setDeleting(true)}>
            {S.common.delete}
          </Button>
        </div>
      </Card>

      {query.data && (
        <div className="grid grid-cols-2 gap-3.5">
          <Card className="flex items-center justify-between">
            <span>{S.assessments.submitted}</span>
            <Chip tone="success" className="!text-base">
              {query.data.statistics.submitted_count}
            </Chip>
          </Card>
          <Card className="flex items-center justify-between">
            <span>{S.assessments.notSubmitted}</span>
            <Chip tone="danger" className="!text-base">
              {query.data.statistics.not_submitted_count}
            </Chip>
          </Card>
        </div>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{S.assessments.grading}</h2>
          <span className="text-sm text-muted">{S.assessments.gradingHint}</span>
        </div>
        {query.isPending ? (
          <ListSkeleton rows={5} />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-1.5 text-[15px]">
              <thead>
                <tr className="text-sm text-muted">
                  <th className="px-4 py-1 text-start font-medium">{S.assessments.student}</th>
                  <th className="px-4 py-1 text-start font-medium">{S.assessments.statusCol}</th>
                  <th className="px-4 py-1 text-start font-medium">{S.assessments.gradeOf(String(total))}</th>
                </tr>
              </thead>
              <tbody>
                {query.data!.students.map((s) => {
                  const graded = (marks[s.student_id] ?? "") !== "";
                  return (
                    <tr key={s.student_id}>
                      <td className="rounded-s-xl bg-soft px-4 py-2.5 font-semibold whitespace-nowrap">{s.student_name}</td>
                      <td className="bg-soft px-4 py-2.5">
                        <Chip tone={graded ? "success" : "neutral"}>{graded ? S.assessments.graded : S.assessments.notGraded}</Chip>
                      </td>
                      <td className="rounded-e-xl bg-soft px-4 py-2">
                        <input
                          inputMode="decimal"
                          aria-label={`${S.evaluation.degree} ${s.student_name}`}
                          value={marks[s.student_id] ?? ""}
                          onChange={(e) => setMarks({ ...marks, [s.student_id]: e.target.value.replace(/[^\d.]/g, "") })}
                          className="h-10 w-24 rounded-[10px] border-[1.5px] border-line-2 bg-white text-center font-semibold outline-none focus:border-primary"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button icon="save" className="self-start" loading={submit.isPending} onClick={save} disabled={!query.data}>
          {S.assessments.saveGrades}
        </Button>
      </Card>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        loading={remove.isPending}
        title={S.assessments.deleteExam}
        body={examTitle(exam, EXAM_LABELS)}
        onConfirm={() =>
          remove.mutate(
            { exam_id: exam.id },
            {
              onSuccess: () => {
                setDeleting(false);
                toast.show(S.common.deletedSuccessfully);
                onDeleted();
              },
              onError: toast.error,
            },
          )
        }
      />
    </div>
  );
}

export function AssessmentList({ exams, selectedId, onSelect, membersCount }: { exams: Exam[]; selectedId: number | null; onSelect: (id: number) => void; membersCount?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {exams.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onSelect(e.id)}
          aria-pressed={e.id === selectedId}
          className={`flex w-full flex-col gap-2 rounded-2xl border-[1.5px] p-4 text-start ${e.id === selectedId ? "border-primary bg-primary-soft" : "border-line bg-white hover:border-primary"}`}
        >
          <span className="flex justify-between gap-2">
            <strong>{examTitle(e, EXAM_LABELS)}</strong>
            <Chip>{e.type === "file" ? S.assessments.typeFile : S.assessments.typeTaseese}</Chip>
          </span>
          <span className="text-sm text-muted">{S.assessments.deadlineAt(formatDate(e.deadline))}</span>
          {membersCount !== undefined && <span className="text-sm text-muted">{S.assessments.totalOf(String(Number(e.total_marks)))}</span>}
        </button>
      ))}
    </div>
  );
}
