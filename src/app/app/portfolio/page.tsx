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
import { buildDailyReport, countItems, emptyPortfolio, loadPortfolio, newId, readDailyReport, savePortfolio } from "@/features/portfolio/portfolio-store";
import { useTeacher } from "@/features/shell/use-teacher";
import { api, apiFile } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { DailyReportData, DailyReportField, PortfolioConstants, PortfolioFolder, PortfolioItem, PortfolioPayload, Teacher } from "@/lib/api/types";
import { saveBlob, stamp } from "@/lib/download";
import { fileSize, formatDate } from "@/lib/format";
import { fileUrl } from "@/lib/site";
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

// Each constants section fills one field of the app's report_fields; the
// order and the single / multiple choices follow the app's form.
const FIXED_FIELDS: { field: DailyReportField; section?: string; multi?: boolean; label?: string }[] = [
  { field: "subject_execution_status", section: "lesson_execution_status" },
  { field: "lesson_goals_achievement", section: "objectives_achievement" },
  { field: "average_participation", section: "participation_average" },
  { field: "average_comprehension", section: "understanding_level" },
  { field: "educational_tools", section: "educational_tools", multi: true },
  { field: "teaching_method", section: "teaching_strategy", multi: true },
  { field: "difficulties_and_challenges", label: P.challenges },
  { field: "immediate_interventions", section: "immediate_interventions", multi: true },
  { field: "general_notes", label: P.generalNotes },
];

const splitList = (v: string) => (v ? v.split(/[،,]/).map((x) => x.trim()).filter(Boolean) : []);

function FixedDataDialog({ open, onClose, value, teacher, onSave }: { open: boolean; onClose: () => void; value: unknown; teacher: Teacher | undefined; onSave: (v: DailyReportData) => void }) {
  const constants = useApiQuery<PortfolioConstants>(Endpoints.portfolioConstants, undefined, { enabled: open, staleTime: Infinity });
  const [fields, setFields] = useState(() => readDailyReport(value).fields);
  const [principal, setPrincipal] = useState("");
  useEffect(() => {
    if (!open) return;
    const current = readDailyReport(value);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFields(current.fields);
    setPrincipal(current.principal || teacher?.manager_name || "");
  }, [open, value, teacher]);
  const set = (field: DailyReportField, v: string) => setFields((f) => ({ ...f, [field]: v }));
  const options = (section: string) => (constants.data?.grouped_constants[section] ?? []).map((c) => c.content);

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
              onSave(buildDailyReport(teacher, fields, principal.trim()));
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
          <TextField label={P.principalName} value={principal} onChange={(e) => setPrincipal(e.target.value)} />
          {FIXED_FIELDS.map(({ field, section, multi, label }) => {
            if (!section) return <TextArea key={field} label={label} rows={2} value={fields[field]} onChange={(e) => set(field, e.target.value)} />;
            const list = options(section);
            if (!list.length) return null;
            const title = constants.data!.sections[section] ?? section;
            if (!multi) {
              return (
                <Select key={field} label={title} value={fields[field]} onChange={(e) => set(field, e.target.value)}>
                  <option value="">{P.choose}</option>
                  {/* Keep a saved value the constants no longer list. */}
                  {fields[field] && !list.includes(fields[field]) && <option value={fields[field]}>{fields[field]}</option>}
                  {list.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              );
            }
            const chosen = splitList(fields[field]);
            return (
              <fieldset key={field} className="flex flex-col gap-1">
                <legend className="mb-1 font-semibold">{title}</legend>
                <div className="flex flex-wrap gap-x-6">
                  {list.map((o) => (
                    <Checkbox
                      key={o}
                      label={o}
                      checked={chosen.includes(o)}
                      onChange={(e) => set(field, (e.target.checked ? [...chosen, o] : chosen.filter((x) => x !== o)).join(P.listSeparator))}
                    />
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

const ACCEPT: Record<Exclude<PortfolioItem["type"], "text">, string> = { image: "image/*", video: "video/*", pdf: "application/pdf" };

interface UploadedFile {
  uuid: string;
  file_name: string;
  file_path: string;
}

/** Media goes up with `upload/file` (`files[]`); the item keeps its file_path as `url`, like the app. */
async function uploadMedia(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append("files[]", file);
  const data = await api<UploadedFile | UploadedFile[]>(Endpoints.uploadTeacherPortfolioFile, form);
  const uploaded = Array.isArray(data) ? data[0] : data;
  if (!uploaded?.file_path) throw new Error(S.errors.generic);
  return uploaded;
}

function ItemDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (item: PortfolioItem) => void }) {
  const toast = useToast();
  const [form, setForm] = useState<{ type: PortfolioItem["type"]; title: string; content: string }>({ type: "text", title: "", content: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ type: "text", title: "", content: "" });
    setFile(null);
    setError(null);
  }, [open]);
  async function submit() {
    if (!form.title.trim() || (form.type === "text" ? !form.content.trim() : !file)) {
      setError(S.errors.required);
      return;
    }
    const base = { type: form.type, title: form.title.trim(), note_date: new Date().toISOString() };
    if (form.type === "text" || !file) {
      onAdd({ ...base, content: form.content.trim() });
      onClose();
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file);
      onAdd({ ...base, url: fileUrl(uploaded.file_path) ?? uploaded.file_path });
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setUploading(false);
    }
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={P.addItem}
      footer={
        <>
          <Button loading={uploading} onClick={submit}>
            {S.common.add}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label={P.itemTitle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
        <Select
          label={P.itemType}
          value={form.type}
          onChange={(e) => {
            setForm({ ...form, type: e.target.value as PortfolioItem["type"] });
            setFile(null);
          }}
        >
          {(["text", "image", "video", "pdf"] as const).map((t) => (
            <option key={t} value={t}>
              {P.typeLabel[t]}
            </option>
          ))}
        </Select>
        {form.type === "text" ? (
          <TextArea label={P.itemContent} rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-line-2 p-6 text-center hover:border-primary">
            <span className="text-sm font-medium text-ink-2">{P.itemFile}</span>
            <span className="font-semibold">{file ? file.name : P.chooseFile}</span>
            {file && <span className="text-sm text-muted">{fileSize(file.size)}</span>}
            <input
              type="file"
              accept={ACCEPT[form.type]}
              className="sr-only"
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                setFile(picked);
                if (picked && !form.title.trim()) setForm((f) => ({ ...f, title: picked.name.replace(/\.[^.]+$/, "") }));
              }}
            />
          </label>
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
    if (!doc) return;
    setExporting(true);
    try {
      // Unsaved changes are synced too, so the cloud copy matches the PDF.
      if (dirty) await save();
      // Postman: the portfolio JSON goes up as `file`, the PDF comes back.
      const form = new FormData();
      form.append("file", new Blob([JSON.stringify(doc)], { type: "application/json" }), `achievement_${Date.now()}.json`);
      const { blob, fileName } = await apiFile(Endpoints.exportPortfolioPdfFile, form);
      saveBlob(blob, fileName ?? `portfolio_${stamp()}.pdf`);
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
        teacher={teacher.data}
        onSave={(v) => update({ ...doc, achievement: { ...doc.achievement, daily_report_data: v } })}
      />
    </>
  );
}
