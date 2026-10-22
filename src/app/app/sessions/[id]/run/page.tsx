"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState, PageSkeleton, QueryView } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { KaganDialog } from "@/features/run/KaganDialog";
import { LuckWheel } from "@/features/run/LuckWheel";
import { QuizDialog } from "@/features/run/QuizDialog";
import { SessionStudentsPanel } from "@/features/run/SessionStudentsPanel";
import { AttendancePanel } from "@/features/session/AttendancePanel";
import { LessonTextCard } from "@/features/session/LessonTextCard";
import { useSession } from "@/features/session/use-session";
import { useTextScale } from "@/features/session/use-text-scale";
import { api } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { MindMap, Question, RankedStudent, Session } from "@/lib/api/types";
import { formatDate, parseApiDate } from "@/lib/format";
import { fileUrl } from "@/lib/site";
import { S } from "@/lib/strings";

type Tab = "questions" | "maps" | "objectives" | "outcomes" | "text" | "book" | "attendance" | "students";

function Countdown({ session }: { session: Session }) {
  const [now, setNow] = useState(() => Date.now());
  const start = parseApiDate(session.started_at ?? session.starts_at)?.getTime() ?? now;
  const end = start + session.duration_minutes * 60_000;
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.round((end - Math.max(now, start)) / 1000));
  return (
    <div className={clsx("flex items-center gap-2 rounded-xl px-4 py-2 text-xl font-bold", left < 300 ? "bg-danger text-white" : "bg-white/15")} dir="ltr" aria-label={S.run.timeLeft}>
      <Icon name="clock" />
      {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
    </div>
  );
}

function QuestionsPresenter({ questions }: { questions: Question[] }) {
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(false);
  const q = questions[index];
  if (!q) return <EmptyState icon="help" title={S.run.noQuestions} />;
  return (
    <Card className="flex flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted">{S.run.questionOf(index + 1, questions.length)}</span>
        <div className="flex gap-2">
          <Button variant="outline" disabled={index === 0} onClick={() => { setIndex((i) => i - 1); setReveal(false); }}>
            {S.common.previous}
          </Button>
          <Button disabled={index === questions.length - 1} onClick={() => { setIndex((i) => i + 1); setReveal(false); }}>
            {S.common.next}
          </Button>
        </div>
      </div>
      <ProgressBar value={((index + 1) / questions.length) * 100} color="var(--color-accent)" height={6} />
      <h1 className="text-3xl font-bold leading-relaxed sm:text-[34px]" dir={q.is_rtl === 0 ? "ltr" : "rtl"}>
        {q.question_text}
      </h1>
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]" dir={q.is_rtl === 0 ? "ltr" : "rtl"}>
        {q.options.map((o, i) => (
          <div key={o.id} className={clsx("flex min-h-17 items-center gap-3.5 rounded-2xl border-[1.5px] px-5 text-xl", reveal && o.id === q.correct_answer ? "border-success bg-success-soft font-semibold" : "border-line bg-white")}>
            <b className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-base text-primary">{i + 1}</b>
            {o.content}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="outline" icon={reveal ? "eyeOff" : "eye"} onClick={() => setReveal((r) => !r)}>
          {reveal ? S.run.hideAnswer : S.run.showAnswer}
        </Button>
      </div>
      {reveal && q.explanation && <p className="rounded-xl bg-surface p-4 leading-8 text-ink-2">{q.explanation}</p>}
    </Card>
  );
}

function RunView() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useSession(sessionId);
  const questions = useApiQuery<Question[]>(Endpoints.classSessionQuestions, { session_id: sessionId });
  const maps = useApiQuery<MindMap[]>(Endpoints.classSessionMindMaps, { session_id: sessionId });
  const students = useApiQuery<RankedStudent[]>(Endpoints.getGroupStudents, { group_id: query.data?.group_id, type: "performance" }, { enabled: Boolean(query.data) });
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "questions");
  const [tool, setTool] = useState<"quiz" | "kagan" | null>(null);
  const [ending, setEnding] = useState(false);
  const [scale, setScale] = useTextScale();
  const started = useRef(false);
  const end = useApiMutation(Endpoints.classSessionMarkAsCompleted, { invalidates: [Endpoints.classSessionShow, Endpoints.showGroup, Endpoints.home] });

  // Opening the run screen starts a pending session (attendance unlocks).
  useEffect(() => {
    const s = query.data;
    if (!s || s.status !== "pending" || started.current) return;
    started.current = true;
    api(Endpoints.classSessionStart, { session_id: s.id })
      .then(() => queryClient.invalidateQueries({ queryKey: [Endpoints.classSessionShow] }))
      .catch(() => null);
  }, [query.data, queryClient]);

  return (
    <QueryView query={query} loading={<div className="p-6"><PageSkeleton /></div>}>
      {(s) => {
        const people = (students.data ?? []).map((x) => ({ id: x.id, name: x.name }));
        const tabs: { key: Tab; label: string }[] = [
          { key: "questions", label: S.run.tabQuestions },
          { key: "maps", label: S.run.tabMaps },
          { key: "objectives", label: S.run.tabObjectives },
          { key: "outcomes", label: S.run.tabOutcomes },
          { key: "text", label: S.run.tabText },
          { key: "book", label: S.run.tabBook },
          { key: "attendance", label: S.run.tabAttendance },
          { key: "students", label: S.run.tabStudents },
        ];
        const textTab = tab === "objectives" || tab === "outcomes" || tab === "text";
        return (
          <div className="flex min-h-screen flex-col bg-soft">
            <header className="flex flex-wrap items-center gap-4 bg-primary px-4 py-3.5 text-white sm:px-6">
              <Link href={`/app/sessions/${s.id}`} aria-label={S.common.back} className="grid size-11 place-items-center rounded-xl bg-white/15">
                <Icon name="chevronRight" strokeWidth={2} />
              </Link>
              <div className="min-w-0 flex-[1_1_240px]">
                <div className="truncate text-lg font-semibold">
                  {s.name} - {s.lesson_name ?? S.common.dash}
                </div>
                <div className="text-sm text-primary-200">{formatDate(s.starts_at, true)}</div>
              </div>
              <Countdown session={s} />
              <Button variant="accent" onClick={() => setEnding(true)} disabled={s.status === "completed"}>
                {s.status === "completed" ? S.run.ended : S.run.end}
              </Button>
            </header>

            <main id="main" className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
              <Tabs label={S.run.tools} tone="solid" items={tabs} value={tab} onChange={setTab} className="self-start" />
              <div className="flex flex-wrap items-start gap-5">
                <section className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
                  {tab === "questions" && <QuestionsPresenter questions={questions.data ?? []} />}
                  {tab === "maps" &&
                    ((maps.data ?? []).length === 0 ? (
                      <EmptyState icon="file" title={S.prep.noMaps} />
                    ) : (
                      maps.data!.map((m) => (
                        <Card key={m.id} className="flex flex-col gap-3">
                          <strong>{m.file_name}</strong>
                          <iframe title={m.file_name} src={fileUrl(m.file_path) ?? undefined} className="h-[70vh] w-full rounded-xl border border-line bg-white" />
                        </Card>
                      ))
                    ))}
                  {textTab && (
                    <>
                      <label className="flex items-center gap-2 self-start rounded-xl bg-white px-4 py-2 text-sm text-muted">
                        {S.prep.textSize}
                        <input type="range" min={0.8} max={1.6} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="accent-primary" />
                      </label>
                      <LessonTextCard
                        title={tab === "objectives" ? S.session.objectives : tab === "outcomes" ? S.session.outcomes : S.session.prepText}
                        text={tab === "objectives" ? s.lesson_objectives : tab === "outcomes" ? s.educational_outcome : s.preparation_text}
                        scale={scale * 1.2}
                      />
                    </>
                  )}
                  {tab === "book" &&
                    (s.lesson_file ? (
                      <Card className="flex flex-col gap-3">
                        <iframe title={S.run.tabBook} src={fileUrl(s.lesson_file) ?? undefined} className="h-[72vh] w-full rounded-xl border border-line" />
                        <a href={fileUrl(s.lesson_file) ?? "#"} target="_blank" rel="noopener" className="self-start font-semibold text-primary">
                          {S.run.openBook}
                        </a>
                      </Card>
                    ) : (
                      <EmptyState icon="book" title={S.run.noBook} />
                    ))}
                  {tab === "attendance" && <AttendancePanel session={s} />}
                  {tab === "students" && <SessionStudentsPanel session={s} />}
                </section>

                <aside className="flex flex-[1_1_300px] flex-col gap-4">
                  <LuckWheel students={people} />
                  <Card className="flex flex-col gap-2.5">
                    <strong>{S.run.tools}</strong>
                    <button type="button" onClick={() => setTool("quiz")} disabled={!questions.data?.length} className="flex min-h-15 items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start disabled:opacity-50">
                      <Icon name="trophy" className="size-6 text-primary" />
                      <span className="flex-1">
                        {S.run.quiz}
                        <span className="block text-sm text-muted">{S.run.quizSub(questions.data?.length ?? 0)}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTool("kagan")}
                      disabled={s.grouping_method !== "kagan"}
                      className="flex min-h-15 items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start disabled:opacity-50"
                    >
                      <Icon name="clock" className="size-6 text-primary" />
                      <span className="flex-1">
                        {S.run.kagan}
                        {s.grouping_method !== "kagan" && <span className="block text-sm text-muted">{S.run.kaganOnly}</span>}
                      </span>
                    </button>
                  </Card>
                </aside>
              </div>
            </main>

            <QuizDialog open={tool === "quiz"} onClose={() => setTool(null)} sessionId={s.id} questions={questions.data ?? []} students={people} />
            <KaganDialog open={tool === "kagan"} onClose={() => setTool(null)} sessionId={s.id} />
            <ConfirmDialog
              open={ending}
              onClose={() => setEnding(false)}
              danger={false}
              loading={end.isPending}
              title={S.run.endTitle}
              body={S.run.endBody}
              confirmLabel={S.run.end}
              onConfirm={() =>
                end.mutate(
                  { session_id: s.id },
                  {
                    onSuccess: () => {
                      toast.show(S.run.ended);
                      router.replace(`/app/sessions/${s.id}`);
                    },
                    onError: toast.error,
                  },
                )
              }
            />
          </div>
        );
      }}
    </QueryView>
  );
}

export default function RunSessionPage() {
  return (
    <Suspense>
      <RunView />
    </Suspense>
  );
}
