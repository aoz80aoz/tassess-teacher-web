"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState, QueryView } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { performanceColor } from "@/features/common/SessionStatusChip";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { Named, SubjectClassrooms } from "@/lib/api/types";
import { percent } from "@/lib/format";
import { S } from "@/lib/strings";

export default function SubjectClassroomsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const id = Number(subjectId);
  const router = useRouter();
  const toast = useToast();
  const query = useApiQuery<SubjectClassrooms>(Endpoints.allGroups, { subject_id: id });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useApiMutation<Named>(Endpoints.createGroup, {
    invalidates: [Endpoints.allGroups, Endpoints.subjectsByCategory, Endpoints.home, Endpoints.mySubscriptions],
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(S.errors.required);
      return;
    }
    create.mutate(
      { name: name.trim(), subject_id: id },
      {
        onSuccess: (group) => {
          setOpen(false);
          setName("");
          toast.show(S.common.addedSuccessfully);
          router.push(`/app/classrooms/${group.id}`);
        },
        onError: (e) => setError(e.message),
      },
    );
  }

  return (
    <QueryView query={query}>
      {(data) => (
        <>
          <PageHeader
            crumbs={[{ label: S.nav.specialties, href: `/app/specialties?category=${data.subject.subject_category_id}` }, { label: data.subject.subject_category.name }]}
            title={data.subject.name}
            actions={
              <Button icon="plus" onClick={() => setOpen(true)}>
                {S.subject.addClassroom}
              </Button>
            }
          />

          <Link href={`/app/subjects/${id}/evaluation-elements`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-accent-200 bg-accent-soft p-5">
            <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-white text-accent">
              <Icon name="clipboard" className="size-6" />
            </span>
            <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
              <strong className="text-[17px]">{S.subject.evaluationTitle}</strong>
              <span className="text-sm text-accent-ink">{S.subject.evaluationBody}</span>
            </span>
            <span className={buttonClass("outline")}>{S.subject.manageElements}</span>
          </Link>

          {data.groups.length === 0 ? (
            <EmptyState icon="monitor" title={S.subject.noClassrooms} body={S.subject.noClassroomsBody} action={<Button icon="plus" onClick={() => setOpen(true)}>{S.subject.addClassroom}</Button>} />
          ) : (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
              {data.groups.map((g) => (
                <Link key={g.id} href={`/app/classrooms/${g.id}`} className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 hover:border-primary">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-lg">{g.name}</strong>
                    <Chip tone="neutral">{S.subject.students(g.students_count)}</Chip>
                  </div>
                  <div className="flex justify-between text-sm text-muted">
                    <span>{S.subject.performance}</span>
                    <strong className="text-ink">{percent(g.average_performance)}</strong>
                  </div>
                  <ProgressBar value={g.average_performance} color={performanceColor(g.average_performance)} label={S.subject.performance} />
                </Link>
              ))}
            </div>
          )}

          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            title={S.subject.addClassroomTitle}
            size="sm"
            footer={
              <>
                <Button type="submit" form="add-classroom" loading={create.isPending}>
                  {S.common.create}
                </Button>
                <Button variant="soft" onClick={() => setOpen(false)}>
                  {S.common.cancel}
                </Button>
              </>
            }
          >
            <form id="add-classroom" onSubmit={submit}>
              <TextField
                label={S.subject.classroomName}
                placeholder={S.subject.classroomNamePlaceholder}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                error={error}
                autoFocus
              />
            </form>
          </Dialog>
        </>
      )}
    </QueryView>
  );
}
