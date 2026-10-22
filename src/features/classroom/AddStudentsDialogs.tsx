"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox, isValidSaudiPhone, PhoneField, Select, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { IndeterminateBar } from "@/components/ui/Progress";
import { Segmented } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { api, apiFile, toFormData } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { Paginate, RankedStudent } from "@/lib/api/types";
import { useClassroom } from "./use-classroom";
import { useSubscriptions } from "@/features/shell/use-teacher";
import { saveBlob } from "@/lib/download";
import { S } from "@/lib/strings";

const invalidates = [Endpoints.getGroupStudents, Endpoints.showGroup, Endpoints.allGroups];

/** The classroom's grade, from its specialty's subscription (subject_category.classroom_id). */
function useDefaultGrade(classroomId: number): string {
  const classroom = useClassroom(classroomId);
  const subs = useSubscriptions();
  const category = subs.data?.subscriptions.find((s) => s.subject_category_id === classroom.data?.subject_category_id)?.subject_category;
  const id = category?.classroom_id ?? category?.classroom?.id;
  return id ? String(id) : "";
}

/** The `classroom` the API takes: the school grade, 1 to 12 (like the app). */
function GradeSelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Select label={S.students.grade} value={value} onChange={(e) => onChange(e.target.value)} error={error}>
      <option value="">{S.common.selectPlaceholder}</option>
      {S.students.grades.map((g, i) => (
        <option key={g} value={i + 1}>
          {g}
        </option>
      ))}
    </Select>
  );
}

export function ManualStudentDialog({ open, onClose, classroomId }: { open: boolean; onClose: () => void; classroomId: number }) {
  const toast = useToast();
  const blank = { name: "", phone: "", parent: "", identity: "", gender: "male" as "male" | "female", classroom: "" };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useApiMutation(Endpoints.createStudent, { invalidates });
  const defaultGrade = useDefaultGrade(classroomId);
  const classroom = form.classroom || defaultGrade;

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = S.errors.required;
    if (!isValidSaudiPhone(form.phone)) next.phone = S.errors.invalidPhone;
    if (!classroom) next.classroom = S.errors.required;
    // An empty guardian phone is sent as nothing, never as a bare "+966".
    if (form.parent && !isValidSaudiPhone(form.parent)) next.parent = S.errors.invalidPhone;
    setErrors(next);
    if (Object.keys(next).length) return;
    create.mutate(
      {
        name: form.name.trim(),
        phone: `+966${form.phone}`,
        identity_number: form.identity || undefined,
        gender: form.gender,
        parent_phone: form.parent ? `+966${form.parent}` : undefined,
        classroom: Number(classroom),
        group_id: classroomId,
      },
      {
        onSuccess: () => {
          toast.show(S.common.addedSuccessfully);
          setForm(blank);
          onClose();
        },
        onError: toast.error,
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={S.students.manual}
      footer={
        <>
          <Button type="submit" form="manual-student" loading={create.isPending}>
            {S.common.add}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      <form id="manual-student" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextField wrapperClassName="sm:col-span-2" label={S.students.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} autoFocus />
        <PhoneField label={S.students.phone} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} error={errors.phone} />
        <PhoneField label={`${S.students.parentPhone} (${S.common.optional})`} value={form.parent} onChange={(v) => setForm({ ...form, parent: v })} error={errors.parent} />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-2">{S.students.gender}</span>
          <Segmented
            label={S.students.gender}
            value={form.gender}
            onChange={(v) => setForm({ ...form, gender: v })}
            options={[
              { key: "male", label: S.students.male, activeClass: "bg-primary" },
              { key: "female", label: S.students.female, activeClass: "bg-primary" },
            ]}
          />
        </div>
        <GradeSelect value={classroom} onChange={(v) => setForm({ ...form, classroom: v })} error={errors.classroom} />
        <TextField wrapperClassName="sm:col-span-2" label={`${S.students.identity} (${S.common.optional})`} inputMode="numeric" value={form.identity} onChange={(e) => setForm({ ...form, identity: e.target.value.replace(/\D/g, "") })} />
      </form>
    </Dialog>
  );
}

export function ExcelStudentsDialog({ open, onClose, classroomId }: { open: boolean; onClose: () => void; classroomId: number }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const upload = useApiMutation<unknown, FormData>(Endpoints.createStudentsFromExcel, { invalidates });

  async function template() {
    setDownloading(true);
    try {
      const { blob, fileName } = await apiFile(Endpoints.downloadDemoStudentsExcel);
      saveBlob(blob, fileName ?? "students_template.xlsx");
    } catch (e) {
      toast.error(e);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={S.students.excel}
      footer={
        <>
          <Button
            disabled={!file}
            loading={upload.isPending}
            onClick={() =>
              file &&
              upload.mutate(toFormData({ group_id: classroomId, file }), {
                onSuccess: () => {
                  toast.show(S.students.imported);
                  setFile(null);
                  onClose();
                },
                onError: toast.error,
              })
            }
          >
            {S.students.uploadFile}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Button variant="outline" icon="download" loading={downloading} onClick={template} className="self-start">
          {S.students.downloadTemplate}
        </Button>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-line-2 p-8 text-center hover:border-primary">
          <Icon name="sheet" className="size-8 text-primary" />
          <span className="font-semibold">{file ? file.name : S.students.excelFile}</span>
          <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
    </Dialog>
  );
}

interface PoolPage {
  students: { id: number; name: string; phone: string }[];
  paginate: Paginate;
}

export function DatabaseStudentsDialog({ open, onClose, classroomId }: { open: boolean; onClose: () => void; classroomId: number }) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [picked, setPicked] = useState("");
  const defaultGrade = useDefaultGrade(classroomId);
  const grade = picked || defaultGrade;
  // The API also returns students already in this classroom: they are hidden.
  const members = useApiQuery<RankedStudent[]>(Endpoints.getGroupStudents, { group_id: classroomId, type: "performance" }, { enabled: open });
  const memberIds = new Set((members.data ?? []).map((m) => m.id));
  const add = useApiMutation(Endpoints.addMultipleStudentsToGroup, { invalidates: [...invalidates, Endpoints.getStudentsByClassroom] });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().slice(0, 100)), 400);
    return () => clearTimeout(t);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: [Endpoints.getStudentsByClassroom, classroomId, grade, debounced],
    queryFn: ({ pageParam }) => api<PoolPage>(Endpoints.getStudentsByClassroom, { classroom: Number(grade), group_id: classroomId, search: debounced || undefined, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.paginate.current_page < last.paginate.last_page ? last.paginate.current_page + 1 : undefined),
    enabled: open && Boolean(grade),
  });
  const students = (query.data?.pages.flatMap((p) => p.students) ?? []).filter((s) => !memberIds.has(s.id));
  const toggle = (id: number) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={S.students.database}
      footer={
        <>
          <Button
            disabled={!selected.length}
            loading={add.isPending}
            onClick={() =>
              add.mutate(
                { group_id: classroomId, students_ids: selected },
                {
                  onSuccess: () => {
                    toast.show(S.common.addedSuccessfully);
                    setSelected([]);
                    onClose();
                  },
                  onError: toast.error,
                },
              )
            }
          >
            {S.students.addSelected(selected.length)}
          </Button>
          <Button variant="soft" onClick={onClose}>
            {S.common.cancel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <GradeSelect
          value={grade}
          onChange={(v) => {
            setPicked(v);
            setSelected([]);
          }}
        />
        <TextField type="search" placeholder={S.students.search} aria-label={S.students.search} value={search} disabled={!grade} onChange={(e) => setSearch(e.target.value)} />
        {query.isFetching && !query.isFetchingNextPage && <IndeterminateBar />}
        {!grade ? (
          <p className="py-6 text-center text-muted">{S.students.chooseGrade}</p>
        ) : query.error ? (
          <p className="text-sm text-danger">{(query.error as Error).message}</p>
        ) : students.length === 0 && !query.isPending ? (
          <p className="py-6 text-center text-muted">{debounced ? S.students.noResults : S.students.allInClass}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {students.map((s) => (
              <li key={s.id} className="rounded-xl bg-surface px-3">
                <Checkbox
                  checked={selected.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  label={
                    <span className="flex flex-wrap gap-x-3">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-sm text-muted" dir="ltr">
                        {s.phone}
                      </span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {query.hasNextPage && (
          <Button variant="soft" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
            {S.notifications.loadMore}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
