import clsx from "clsx";
import type { ReactNode } from "react";
import { Chip } from "@/components/ui/Card";
import type { Question } from "@/lib/api/types";
import { fileUrl } from "@/lib/site";
import { S } from "@/lib/strings";

/** One look for a session question, in preparation and while running. */
export function QuestionCard({ question, index, actions }: { question: Question; index: number; actions?: ReactNode }) {
  const dir = question.is_rtl === 0 ? "ltr" : "rtl";
  return (
    <article className="relative flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
      {question.source === "taseese" && <Chip tone="accent" className="absolute -top-3 end-4">{S.prep.fromTaseese}</Chip>}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Chip>{S.prep.questionN(index + 1)}</Chip>
          <Chip tone="neutral">{question.question_type === "true_false" ? S.prep.trueFalse : S.prep.multipleChoice}</Chip>
          {question.degree != null && <Chip tone="neutral">{S.prep.degree(question.degree)}</Chip>}
          <Chip tone="neutral">{S.prep.points(Number(question.points))}</Chip>
        </div>
        {actions && <div className="flex shrink-0 gap-1.5">{actions}</div>}
      </div>
      <strong className="leading-8" dir={dir}>
        {question.question_text}
      </strong>
      {question.question_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl(question.question_image)!} alt="" className="max-h-48 rounded-xl object-contain" />
      )}
      <ul className="grid grid-cols-2 gap-2" dir={dir}>
        {question.options.map((o) => (
          <li key={o.id} className={clsx("rounded-[10px] border px-3.5 py-2.5 text-sm", o.id === question.correct_answer ? "border-success-soft bg-success-soft font-semibold text-success-ink" : "border-line bg-surface")}>
            {o.content}
          </li>
        ))}
      </ul>
      {question.explanation && <p className="text-sm leading-7 text-muted">{question.explanation}</p>}
    </article>
  );
}
