"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { AddAssessmentDialog } from "@/features/assessments/AddAssessmentDialog";
import { AssessmentList, AssessmentResults } from "@/features/assessments/AssessmentResults";
import { useClassroom, useClassroomCrumbs } from "@/features/classroom/use-classroom";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { Exam } from "@/lib/api/types";
import { S } from "@/lib/strings";

export default function ClassroomExamsPage() {
  const { id } = useParams<{ id: string }>();
  const classroomId = Number(id);
  const classroom = useClassroom(classroomId);
  const crumbs = useClassroomCrumbs(classroom.data, S.classroom.tileExams);
  const query = useApiQuery<Exam[]>(Endpoints.groupExams, { group_id: classroomId });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  // The exams page lists exams only; homework lives on its session.
  const exams = (query.data ?? []).filter((e) => e.category === "exam");
  const selected = exams.find((e) => e.id === selectedId) ?? exams[0] ?? null;

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={S.assessments.examsTitle}
        actions={
          <Button icon="plus" onClick={() => setAdding(true)}>
            {S.assessments.addExam}
          </Button>
        }
      />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : exams.length === 0 ? (
        <EmptyState icon="doc" title={S.assessments.noExams} body={S.assessments.noExamsBody} action={<Button icon="plus" onClick={() => setAdding(true)}>{S.assessments.addExam}</Button>} />
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-[1_1_280px] lg:max-w-90">
            <AssessmentList exams={exams} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          </div>
          <div className="min-w-0 flex-[3_1_480px]">{selected && <AssessmentResults key={selected.id} exam={selected} onDeleted={() => setSelectedId(null)} />}</div>
        </div>
      )}
      <AddAssessmentDialog open={adding} onClose={() => setAdding(false)} classroomId={classroomId} category="exam" onCreated={(e) => setSelectedId(e.id)} />
    </>
  );
}
