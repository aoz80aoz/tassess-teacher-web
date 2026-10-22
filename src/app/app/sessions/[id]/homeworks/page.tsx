"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ListSkeleton, QueryView } from "@/components/ui/States";
import { AddAssessmentDialog } from "@/features/assessments/AddAssessmentDialog";
import { AssessmentList, AssessmentResults } from "@/features/assessments/AssessmentResults";
import { useSession, useSessionCrumbs } from "@/features/session/use-session";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { Exam } from "@/lib/api/types";
import { S } from "@/lib/strings";

export default function SessionHomeworksPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const query = useSession(sessionId);
  const crumbs = useSessionCrumbs(query.data, S.homeworks.title);
  const exams = useApiQuery<Exam[]>(Endpoints.groupExams, { group_id: query.data?.group_id, session_id: sessionId }, { enabled: Boolean(query.data) });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const homeworks = (exams.data ?? []).filter((e) => e.category === "homework");
  const selected = homeworks.find((e) => e.id === selectedId) ?? homeworks[0] ?? null;

  return (
    <QueryView query={query}>
      {(s) => (
        <>
          <PageHeader
            crumbs={crumbs}
            title={S.homeworks.title}
            subtitle={s.lesson_name}
            actions={
              <Button icon="plus" onClick={() => setAdding(true)}>
                {S.homeworks.add}
              </Button>
            }
          />
          {exams.isPending ? (
            <ListSkeleton />
          ) : homeworks.length === 0 ? (
            <EmptyState icon="fileAdd" title={S.homeworks.none} action={<Button icon="plus" onClick={() => setAdding(true)}>{S.homeworks.add}</Button>} />
          ) : (
            <div className="flex flex-wrap items-start gap-6">
              <div className="min-w-0 flex-[1_1_280px] lg:max-w-90">
                <AssessmentList exams={homeworks} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
              </div>
              <div className="min-w-0 flex-[3_1_480px]">{selected && <AssessmentResults key={selected.id} exam={selected} onDeleted={() => setSelectedId(null)} />}</div>
            </div>
          )}
          <AddAssessmentDialog open={adding} onClose={() => setAdding(false)} classroomId={s.group_id} category="homework" sessionId={s.id} lessonId={s.lesson_id} onCreated={(e) => setSelectedId(e.id)} />
        </>
      )}
    </QueryView>
  );
}
