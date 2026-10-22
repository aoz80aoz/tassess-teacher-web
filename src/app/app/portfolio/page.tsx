"use client";

import clsx from "clsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Checkbox, Select, TextArea, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { IndeterminateBar } from "@/components/ui/Progress";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { countItems, emptyPortfolio, loadPortfolio, newId, savePortfolio } from "@/features/portfolio/portfolio-store";
import { useTeacher } from "@/features/shell/use-teacher";
import { apiFile } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { PortfolioConstants, PortfolioFolder, PortfolioItem, PortfolioPayload } from "@/lib/api/types";
import { saveBlob, stamp } from "@/lib/download";
import { formatDate } from "@/lib/format";
import { S } from "@/lib/strings";

const P = S.portfolio;

/** Folders and subfolders, flattened with their depth for the side list. */
function flatten(folders: PortfolioFolder[], depth = 0): { folder: PortfolioFolder; depth: number }[] {
  return folders.flatMap((f) => [{ folder: f, depth }, ...flatten(f.subFolders, depth + 1)]);
}

function mapFolders(folders: PortfolioFolder[], id: string, change: (f: PortfolioFolder) => PortfolioFolder | null): PortfolioFolder[] {
  return folders.flatMap((f) => {
    if (f.id === id) {
      const next = change(f);
      return next ? [next] : [];
    }
    return [{ ...f, subFolders: mapFolders(f.subFolders, id, change) }];
  });
}

function FixedDataDialog({ open, onClose, value, onSave }: { open: boolean; onClose: () => void; value: Record<string, string>; onSave: (v: Record<string, string>) => void }) {
  const constants = useApiQuery<PortfolioConstants>(Endpoints.portfolioConstants, undefined, { enabled: open, staleTime: Infinity });
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!open) return;
    // Multi-select sections are stored comma-joined (the app's daily_report_data).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v ? v.split(P.listSeparator.trim()).map((x) => x.trim()) : []])));
  }, [open, value]);
  const sections = constants.data ? Object.entries(constants.data.sections) : [];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={P.fixedData}
      size="lg"
      footer={
        <>
          <Button
            disabled={!constants.data}
            onClick={() => {
              onSave(Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.join(P.listSeparator)])));
              onClose();
            }}
          >
            {S.common.save}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      {constants.isPending ? (
        <IndeterminateBar />
      ) : constants.error ? (
        <ErrorState error={constants.error} onRetry={() => constants.refetch()} />
      ) : (
        <div className="flex flex-col gap-5">
          {sections.map(([key, label]) => (
            <fieldset key={key} className="flex flex-col gap-1">
              <legend className="mb-1 font-semibold">{label}</legend>
              <div className="flex flex-wrap gap-x-6">
                {(constants.data!.grouped_constants[key] ?? []).map((c) => (
                  <Checkbox
                    key={c.id}
                    label={c.content}
                    checked={(draft[key] ?? []).includes(c.content)}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked ? [...(d[key] ?? []), c.content] : (d[key] ?? []).filter((x) => x !== c.content) }))}
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </Dialog>
  );
}

function ItemDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (item: PortfolioItem) => void }) {
  const [form, setForm] = useState<{ type: PortfolioItem["type"]; title: string; content: string; url: string }>({ type: "text", title: "", content: "", url: "" });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setForm({ type: "text", title: "", content: "", url: "" });
  }, [open]);
  function submit() {
    if (!form.title.trim() || (form.type === "text" ? !form.content.trim() : !/^https?:\/\//.test(form.url))) {
      setError(S.errors.required);
      return;
    }
    onAdd({ type: form.type, title: form.title.trim(), note_date: new Date().toISOString(), ...(form.type === "text" ? { content: form.content.trim() } : { url: form.url.trim() }) });
    onClose();
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={P.addItem}
      footer={
        <>
          <Button onClick={submit}>{S.common.add}</Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label={P.itemTitle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
        <Select label={P.itemType} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PortfolioItem["type"] })}>
          {(["text", "image", "video", "pdf"] as const).map((t) => (
            <option key={t} value={t}>
              {P.typeLabel[t]}
            </option>
          ))}
        </Select>
        {form.type === "text" ? (
          <TextArea label={P.itemContent} rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        ) : (
          <TextField label={P.itemUrl} dir="ltr" placeholder="https://" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}

export default function PortfolioPage() {
  const toast = useToast();
  const teacher = useTeacher();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["portfolio"], queryFn: loadPortfolio });
  const [doc, setDoc] = useState<PortfolioPayload | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"folder" | "rename" | "deleteFolder" | "item" | "fixed" | null>(null);
  const [folderName, setFolderName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    if (query.data === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDoc(query.data ?? emptyPortfolio(String(teacher.data?.id ?? "")));
  }, [query.data, teacher.data?.id]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (query.isPending || !doc) return query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : <PageSkeleton />;

  const folders = doc.achievement.folders;
  const flat = flatten(folders);
  const selected = flat.find((f) => f.folder.id === selectedId)?.folder ?? folders[0] ?? null;
  const update = (next: PortfolioPayload) => {
    setDoc(next);
    setDirty(true);
  };
  const setFolders = (next: PortfolioFolder[]) => update({ ...doc, achievement: { ...doc.achievement, folders: next } });

  async function save() {
    if (!doc) return;
    setSaving(true);
    try {
      await savePortfolio(doc);
      setDirty(false);
      queryClient.setQueryData(["portfolio"], doc);
      toast.show(S.common.savedSuccessfully);
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function exportPdf() {
    setExporting(true);
    try {
      // The server renders its stored copy, so unsaved changes go up first.
      if (dirty) await save();
      saveBlob(await apiFile(Endpoints.exportPortfolioPdfFile), `portfolio_${stamp()}.pdf`);
      toast.show(S.export.downloaded);
    } catch (e) {
      toast.error(e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={P.title}
        meta={<Chip tone={dirty ? "warning" : "success"} className="self-start">{saving ? P.syncing : dirty ? P.unsynced : P.synced}</Chip>}
        actions={
          <>
            <Button variant="outline" icon="cloudUp" loading={saving} disabled={!dirty} onClick={save}>
              {P.saveCloud}
            </Button>
            <Button variant="accent" icon="download" loading={exporting} onClick={exportPdf}>
              {P.exportPdf}
            </Button>
          </>
        }
      />

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <strong>{P.fixedData}</strong>
          <span className="text-sm text-muted">{P.fixedDataBody}</span>
        </div>
        <Button variant="outline" icon="edit" onClick={() => setDialog("fixed")}>
          {P.editFixed}
        </Button>
      </Card>

      <div className="flex flex-wrap items-start gap-6">
        <Card className="flex flex-[1_1_260px] flex-col gap-1 p-3 lg:max-w-85" aria-label={P.folders}>
          <div className="flex items-center justify-between px-2 pb-3 pt-2">
            <strong>{P.folders}</strong>
            <Button
              variant="soft"
              size="sm"
              icon="plus"
              onClick={() => {
                setFolderName("");
                setParentId(null);
                setDialog("folder");
              }}
            >
              {P.newFolder}
            </Button>
          </div>
          {flat.length === 0 && <p className="p-4 text-center text-sm text-muted">{P.noFolders}</p>}
          {flat.map(({ folder, depth }) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelectedId(folder.id)}
              aria-current={selected?.id === folder.id || undefined}
              className={clsx("flex min-h-12 items-center gap-2.5 rounded-xl px-3 text-start", selected?.id === folder.id ? "bg-accent-soft font-semibold text-accent-ink" : "hover:bg-soft")}
              style={{ paddingInlineStart: `${0.75 + depth * 1.25}rem` }}
            >
              <Icon name="folder" />
              <span className="flex-1 leading-6">{folder.name}</span>
              <Chip tone="neutral">{countItems(folder)}</Chip>
            </button>
          ))}
        </Card>

        <section className="flex min-w-0 flex-[3_1_440px] flex-col gap-4">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="soft"
                    size="sm"
                    icon="plus"
                    onClick={() => {
                      setFolderName("");
                      setParentId(selected.id);
                      setDialog("folder");
                    }}
                  >
                    {P.newFolder}
                  </Button>
                  <IconButton
                    icon="edit"
                    label={P.renameFolder}
                    onClick={() => {
                      setFolderName(selected.name);
                      setDialog("rename");
                    }}
                  />
                  <IconButton icon="trash" variant="danger" label={P.deleteFolder} onClick={() => setDialog("deleteFolder")} />
                  <Button icon="plus" onClick={() => setDialog("item")}>
                    {P.addItem}
                  </Button>
                </div>
              </div>
              {(selected.items ?? []).length === 0 ? (
                <EmptyState icon="folder" title={P.noItems} action={<Button icon="plus" onClick={() => setDialog("item")}>{P.addItem}</Button>} />
              ) : (
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
                  {selected.items!.map((item, i) => (
                    <Card key={i} className="flex flex-col gap-2.5 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Chip tone={item.type === "text" ? "info" : "accent"}>{P.typeLabel[item.type]}</Chip>
                        <IconButton
                          icon="trash"
                          variant="danger"
                          label={S.common.delete}
                          onClick={() => setFolders(mapFolders(folders, selected.id, (f) => ({ ...f, items: (f.items ?? []).filter((_, k) => k !== i) })))}
                        />
                      </div>
                      <strong className="leading-7">{item.title}</strong>
                      {item.content && <p className="line-clamp-4 whitespace-pre-line text-sm leading-7 text-muted">{item.content}</p>}
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener" className="truncate text-sm text-primary" dir="ltr">
                          {item.url}
                        </a>
                      )}
                      {item.note_date && <span className="text-xs text-muted">{formatDate(new Date(item.note_date))}</span>}
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState icon="folder" title={P.noFolders} />
          )}
        </section>
      </div>

      <Dialog
        open={dialog === "folder" || dialog === "rename"}
        onClose={() => setDialog(null)}
        title={dialog === "rename" ? P.renameFolder : P.newFolder}
        size="sm"
        footer={
          <Button
            disabled={!folderName.trim()}
            onClick={() => {
              const name = folderName.trim();
              if (dialog === "rename" && selected) setFolders(mapFolders(folders, selected.id, (f) => ({ ...f, name })));
              else if (parentId) setFolders(mapFolders(folders, parentId, (f) => ({ ...f, subFolders: [...f.subFolders, { id: newId(), name, subFolders: [], items: [] }] })));
              else setFolders([...folders, { id: newId(), name, subFolders: [], items: [] }]);
              setDialog(null);
            }}
          >
            {S.common.save}
          </Button>
        }
      >
        <TextField label={P.folderName} value={folderName} onChange={(e) => setFolderName(e.target.value)} autoFocus />
      </Dialog>

      <ConfirmDialog
        open={dialog === "deleteFolder"}
        onClose={() => setDialog(null)}
        title={P.deleteFolder}
        body={
          <>
            <strong>{selected?.name}</strong>
            <br />
            {P.deleteFolderBody}
          </>
        }
        onConfirm={() => {
          if (selected) setFolders(mapFolders(folders, selected.id, () => null));
          setSelectedId(null);
          setDialog(null);
        }}
      />

      <ItemDialog open={dialog === "item"} onClose={() => setDialog(null)} onAdd={(item) => selected && setFolders(mapFolders(folders, selected.id, (f) => ({ ...f, items: [...(f.items ?? []), item] })))} />
      <FixedDataDialog
        open={dialog === "fixed"}
        onClose={() => setDialog(null)}
        value={doc.achievement.daily_report_data}
        onSave={(v) => update({ ...doc, achievement: { ...doc.achievement, daily_report_data: v } })}
      />
    </>
  );
}
