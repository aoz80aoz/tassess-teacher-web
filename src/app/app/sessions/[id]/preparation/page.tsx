"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { TextArea, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, ListSkeleton, QueryView } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { QuestionCard } from "@/features/session/QuestionCard";
import { QuestionFormDialog } from "@/features/session/QuestionFormDialog";
import { useSession, useSessionCrumbs } from "@/features/session/use-session";
import { useTextScale } from "@/features/session/use-text-scale";
import { api, toFormData } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { MindMap, Question, Session } from "@/lib/api/types";
import { formatDate, formatTime } from "@/lib/format";
import { fileUrl } from "@/lib/site";
import { S } from "@/lib/strings";
import { useQueryClient } from "@tanstack/react-query";

type Tab = "questions" | "maps" | "objectives" | "outcomes" | "text";

const TEXT_FIELDS = {
  objectives: { endpoint: Endpoints.classSessionUpdateLessonObjectives, key: "lesson_objectives", title: S.prep.tabObjectives },
  outcomes: { endpoint: Endpoints.classSessionUpdateEducationalOutcome, key: "educational_outcome", title: S.prep.tabOutcomes },
  text: { endpoint: Endpoints.classSessionUpdatePreparation, key: "preparation_text", title: S.prep.tabText },
} as const;

/** Any change to the preparation marks the session prepared (silently, like the app). */
function useMarkPrepared(session: Session | undefined) {
  const queryClient = useQueryClient();
  return () => {
    if (!session || session.is_prepared) return;
    api(Endpoints.classSessionMarkAsPrepared, { session_id: session.id })
      .then(() => Promise.all([Endpoints.classSessionShow, Endpoints.showGroup, Endpoints.home].map((k) => queryClient.invalidateQueries({ queryKey: [k] }))))
      .catch(() => null);
  };
}

function QuestionsTab({ session, onChanged }: { session: Session; onChanged: () => void }) {
  const toast = useToast();
  const query = useApiQuery<Question[]>(Endpoints.classSessionQuestions, { session_id: session.id });
  const [editing, setEditing] = useState<Question | null | "new">(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const importTaseese = useApiMutation<Question[] | null>(Endpoints.classSessionQuestionsTaseese, { invalidates: [Endpoints.classSessionQuestions] });
  const remove = useApiMutation(Endpoints.classSessionQuestionsDelete, { invalidates: [Endpoints.classSessionQuestions] });
  const list = query.data ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{S.prep.questionsCount(list.length, list.filter((q) => q.source === "taseese").length)}</span>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            icon="database"
            loading={importTaseese.isPending}
            onClick={() =>
              importTaseese.mutate(
                { session_id: session.id },
                {
                  // The API answers data: null; a returned list gives the count.
                  onSuccess: (added) => {
                    toast.show(Array.isArray(added) ? S.prep.importDone(added.length) : S.prep.importDoneAll);
                    onChanged();
                  },
                  onError: toast.error,
                },
              )
            }
          >
            {S.prep.importTaseese}
          </Button>
          <Button icon="plus" onClick={() => setEditing("new")}>
            {S.prep.manualQuestion}
          </Button>
        </div>
      </div>
      {query.isPending ? (
        <ListSkeleton />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon="help" title={S.prep.noQuestions} body={S.prep.noQuestionsBody} />
      ) : (
        <div className="grid gap-5 pt-2 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
          {list.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              actions={
                <>
                  {q.source === "manual" && <IconButton icon="edit" label={S.prep.editQuestion} onClick={() => setEditing(q)} />}
                  <IconButton icon="trash" variant="danger" label={S.prep.deleteQuestion} onClick={() => setDeleting(q)} />
                </>
              }
            />
          ))}
        </div>
      )}
      <QuestionFormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={onChanged}
        sessionId={session.id}
        question={editing === "new" ? null : editing}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        loading={remove.isPending}
        title={S.prep.deleteQuestion}
        body={deleting?.question_text}
        onConfirm={() =>
          deleting &&
          remove.mutate(
            { questions_ids: [deleting.id] },
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
  );
}

function MapsTab({ session, onChanged }: { session: Session; onChanged: () => void }) {
  const toast = useToast();
  const query = useApiQuery<MindMap[]>(Endpoints.classSessionMindMaps, { session_id: session.id });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<MindMap | null>(null);
  const upload = useApiMutation<MindMap, FormData>(Endpoints.classSessionMindMapUpload, { invalidates: [Endpoints.classSessionMindMaps] });
  const remove = useApiMutation(Endpoints.classSessionMindMapDelete, { invalidates: [Endpoints.classSessionMindMaps] });
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{S.prep.mapsHint}</span>
        <Button icon="plus" onClick={() => setAdding(true)}>
          {S.prep.addMap}
        </Button>
      </div>
      {query.isPending ? (
        <ListSkeleton rows={2} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState icon="file" title={S.prep.noMaps} />
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {query.data!.map((m) => (
            <Card key={m.id} className="flex flex-col gap-3">
              <a href={fileUrl(m.file_path) ?? "#"} target="_blank" rel="noopener" className="grid h-36 place-items-center rounded-xl bg-primary-soft font-bold text-primary">
                {S.common.pdf}
              </a>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <strong className="block truncate">{m.file_name}</strong>
                  <span className="text-sm text-muted">{formatDate(m.created_at)}</span>
                </div>
                <IconButton icon="trash" variant="danger" label={S.prep.deleteMap} onClick={() => setDeleting(m)} />
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title={S.prep.addMap}
        size="sm"
        footer={
          <>
            <Button
              disabled={!file}
              loading={upload.isPending}
              onClick={() =>
                file &&
                upload.mutate(toFormData({ session_id: session.id, file_name: name || file.name, file }), {
                  onSuccess: () => {
                    setAdding(false);
                    setName("");
                    setFile(null);
                    toast.show(S.common.addedSuccessfully);
                    onChanged();
                  },
                  onError: toast.error,
                })
              }
            >
              {S.common.add}
            </Button>
            <Button variant="soft" onClick={() => setAdding(false)}>
              {S.common.cancel}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label={S.prep.mapName} value={name} onChange={(e) => setName(e.target.value)} />
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-line-2 p-6 text-center hover:border-primary">
            <Icon name="file" className="size-7 text-primary" />
            <span className="font-semibold">{file?.name ?? S.prep.mapFile}</span>
            <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        loading={remove.isPending}
        title={S.prep.deleteMap}
        body={deleting?.file_name}
        onConfirm={() => deleting && remove.mutate({ mind_map_id: deleting.id }, { onSuccess: () => setDeleting(null), onError: toast.error })}
      />
    </>
  );
}

function TextTab({ session, field, onChanged }: { session: Session; field: keyof typeof TEXT_FIELDS; onChanged: () => void }) {
  const toast = useToast();
  const meta = TEXT_FIELDS[field];
  const current = (session[meta.key] as string | null) ?? "";
  const [scale, setScale] = useTextScale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const save = useApiMutation(meta.endpoint, { invalidates: [Endpoints.classSessionShow] });
  return (
    <Card className="flex flex-col gap-4 p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{meta.title}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted">
            {S.prep.textSize}
            <input type="range" min={0.8} max={1.6} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="accent-primary" />
          </label>
          <Button
            variant="outline"
            icon="edit"
            onClick={() => {
              setDraft(current);
              setEditing(true);
            }}
          >
            {S.prep.editText}
          </Button>
        </div>
      </div>
      <p className="whitespace-pre-line leading-[2] text-ink-2" style={{ fontSize: `${scale}rem` }}>
        {current.trim() ? current : S.session.empty}
      </p>
      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title={meta.title}
        size="lg"
        footer={
          <>
            <Button
              loading={save.isPending}
              onClick={() =>
                draft === current
                  ? setEditing(false)
                  : save.mutate(
                      { session_id: session.id, [meta.key]: draft },
                      {
                        onSuccess: () => {
                          setEditing(false);
                          toast.show(S.common.savedSuccessfully);
                          onChanged();
                        },
                        onError: toast.error,
                      },
                    )
              }
            >
              {S.common.save}
            </Button>
            <Button variant="soft" onClick={() => setEditing(false)}>
              {S.common.cancel}
            </Button>
          </>
        }
      >
        <TextArea aria-label={meta.title} rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
      </Dialog>
    </Card>
  );
}

export default function PreparationPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const query = useSession(sessionId);
  const crumbs = useSessionCrumbs(query.data, S.prep.title);
  const [tab, setTab] = useState<Tab>("questions");
  const markPrepared = useMarkPrepared(query.data);

  return (
    <QueryView query={query}>
      {(s) => (
        <>
          <PageHeader
            crumbs={crumbs}
            title={S.prep.title}
            meta={
              <div className="flex flex-wrap gap-2">
                <Chip tone="neutral">{formatDate(s.starts_at, true)}</Chip>
                <Chip tone="neutral">{formatTime(s.starts_at)}</Chip>
                <Chip tone={s.is_prepared ? "success" : "warning"}>{s.is_prepared ? S.status.prepared : S.prep.autoPrepared}</Chip>
              </div>
            }
            actions={
              <ButtonLink href={`/app/sessions/${s.id}/run?tab=students`} icon="star">
                {S.session.tileAssess}
              </ButtonLink>
            }
          />
          <Tabs
            className="self-start"
            label={S.prep.title}
            value={tab}
            onChange={setTab}
            items={[
              { key: "questions", label: S.prep.tabQuestions },
              { key: "maps", label: S.prep.tabMaps },
              { key: "objectives", label: S.prep.tabObjectives },
              { key: "outcomes", label: S.prep.tabOutcomes },
              { key: "text", label: S.prep.tabText },
            ]}
          />
          {tab === "questions" && <QuestionsTab session={s} onChanged={markPrepared} />}
          {tab === "maps" && <MapsTab session={s} onChanged={markPrepared} />}
          {(tab === "objectives" || tab === "outcomes" || tab === "text") && <TextTab key={tab} session={s} field={tab} onChanged={markPrepared} />}
        </>
      )}
    </QueryView>
  );
}
