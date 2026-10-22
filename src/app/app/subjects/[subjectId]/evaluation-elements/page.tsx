"use client";

import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Checkbox, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, QueryView } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { EvaluationElement, EvaluationElementsByPhase, SubjectClassrooms } from "@/lib/api/types";
import { S } from "@/lib/strings";

type Phase = "phase_1" | "phase_2";

export default function EvaluationElementsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const id = Number(subjectId);
  const toast = useToast();
  const subject = useApiQuery<SubjectClassrooms>(Endpoints.allGroups, { subject_id: id });
  const query = useApiQuery<EvaluationElementsByPhase>(Endpoints.evaluationElementsSubject, { subject_id: id });
  const [phase, setPhase] = useState<Phase>("phase_1");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<EvaluationElement | null>(null);
  const [form, setForm] = useState({ name: "", max: "", p1: true, p2: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const invalidates = [Endpoints.evaluationElementsSubject, Endpoints.evaluationElementsGroup];
  const store = useApiMutation(Endpoints.evaluationElementsStore, { invalidates });
  const remove = useApiMutation(Endpoints.evaluationElementsDelete, { invalidates });

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const max = Number(form.max);
    if (!form.name.trim()) next.name = S.errors.required;
    if (!Number.isInteger(max) || max < 1 || max > 200) next.max = S.errors.gradeOutOfRange(200);
    if (!form.p1 && !form.p2) next.periods = S.errors.required;
    setErrors(next);
    if (Object.keys(next).length) return;
    // Both periods = no `phase`; one period = that phase (backend contract).
    const body: Record<string, unknown> = { subject_id: id, name: form.name.trim(), max_degree: max };
    if (form.p1 !== form.p2) body.phase = form.p1 ? 1 : 2;
    store.mutate(body, {
      onSuccess: () => {
        setAdding(false);
        setForm({ name: "", max: "", p1: true, p2: true });
        toast.show(S.common.addedSuccessfully);
      },
      onError: toast.error,
    });
  }

  return (
    <QueryView query={query}>
      {(data) => (
        <>
          <PageHeader
            crumbs={[{ label: S.nav.specialties, href: "/app/specialties" }, { label: subject.data?.subject.name ?? "", href: `/app/subjects/${id}` }, { label: S.evaluation.title }]}
            title={S.evaluation.title}
            subtitle={S.evaluation.subtitle}
            actions={
              <Button icon="plus" onClick={() => setAdding(true)}>
                {S.evaluation.add}
              </Button>
            }
          />
          <Tabs
            className="self-start"
            label={S.evaluation.periods}
            value={phase}
            onChange={setPhase}
            items={[
              { key: "phase_1", label: S.common.period1 },
              { key: "phase_2", label: S.common.period2 },
            ]}
          />
          {data[phase].length === 0 ? (
            <EmptyState icon="clipboard" title={S.evaluation.none} />
          ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
              {data[phase].map((el) => (
                <Card key={el.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <strong>{el.name}</strong>
                    <Chip className="self-start">{S.classroom.degrees(el.max_degree)}</Chip>
                  </div>
                  <IconButton icon="trash" variant="danger" label={S.common.delete} onClick={() => setDeleting(el)} />
                </Card>
              ))}
            </div>
          )}

          <Dialog
            open={adding}
            onClose={() => setAdding(false)}
            title={S.evaluation.add}
            size="sm"
            footer={
              <>
                <Button type="submit" form="add-element" loading={store.isPending}>
                  {S.common.add}
                </Button>
                <Button variant="soft" onClick={() => setAdding(false)}>
                  {S.common.cancel}
                </Button>
              </>
            }
          >
            <form id="add-element" onSubmit={submit} className="flex flex-col gap-4">
              <TextField label={S.evaluation.name} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} autoFocus />
              <TextField label={S.evaluation.maxDegree} inputMode="numeric" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value.replace(/\D/g, "") })} error={errors.max} />
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 text-sm font-medium text-ink-2">{S.evaluation.periods}</legend>
                <div className="flex flex-wrap gap-6">
                  <Checkbox label={S.common.period1} checked={form.p1} onChange={(e) => setForm({ ...form, p1: e.target.checked })} />
                  <Checkbox label={S.common.period2} checked={form.p2} onChange={(e) => setForm({ ...form, p2: e.target.checked })} />
                </div>
                {errors.periods && <p className="text-sm text-danger">{errors.periods}</p>}
              </fieldset>
            </form>
          </Dialog>

          <ConfirmDialog
            open={deleting !== null}
            onClose={() => setDeleting(null)}
            loading={remove.isPending}
            title={S.common.confirmDeleteTitle}
            body={
              <>
                <strong>{deleting?.name}</strong>
                <br />
                {S.evaluation.deleteBody}
              </>
            }
            onConfirm={() =>
              deleting &&
              remove.mutate(
                { evaluation_element_id: deleting.id, subject_id: id },
                {
                  onSuccess: () => {
                    setDeleting(null);
                    toast.show(S.common.deletedSuccessfully);
                  },
                  onError: toast.error,
                },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}
