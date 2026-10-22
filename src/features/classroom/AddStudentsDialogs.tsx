"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox, isValidSaudiPhone, PhoneField, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { IndeterminateBar } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { api, apiFile, toFormData } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation } from "@/lib/api/hooks";
import type { Paginate } from "@/lib/api/types";
import { saveBlob } from "@/lib/download";
import { S } from "@/lib/strings";

const invalidates = [Endpoints.getGroupStudents, Endpoints.showGroup, Endpoints.allGroups];

export function ManualStudentDialog({ open, onClose, classroomId }: { open: boolean; onClose: () => void; classroomId: number }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", phone: "", parent: "", identity: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useApiMutation(Endpoints.createStudent, { invalidates });

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = S.errors.required;
    if (!isValidSaudiPhone(form.phone)) next.phone = S.errors.invalidPhone;
    // An empty guardian phone is sent as nothing, never as a bare "+966".
    if (form.parent && !isValidSaudiPhone(form.parent)) next.parent = S.errors.invalidPhone;
    setErrors(next);
    if (Object.keys(next).length) return;
    create.mutate(
      {
        group_id: classroomId,
        name: form.name.trim(),
        phone: `+966${form.phone}`,
        parent_phone: form.parent ? `+966${form.parent}` : undefined,
        identity_number: form.identity || undefined,
        gender: "female",
      },
      {
        onSuccess: () => {
          toast.show(S.common.addedSuccessfully);
          setForm({ name: "", phone: "", parent: "", identity: "" });
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
      saveBlob(await apiFile(Endpoints.downloadDemoStudentsExcel), "students-template.csv");
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
          <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
  const add = useApiMutation(Endpoints.addMultipleStudentsToGroup, { invalidates: [...invalidates, Endpoints.getStudentsByClassroom] });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().slice(0, 100)), 400);
    return () => clearTimeout(t);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: [Endpoints.getStudentsByClassroom, classroomId, debounced],
    queryFn: ({ pageParam }) => api<PoolPage>(Endpoints.getStudentsByClassroom, { group_id: classroomId, search: debounced || undefined, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.paginate.current_page < last.paginate.last_page ? last.paginate.current_page + 1 : undefined),
    enabled: open,
  });
  const students = query.data?.pages.flatMap((p) => p.students) ?? [];
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
        <TextField type="search" placeholder={S.students.search} aria-label={S.students.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        {query.isFetching && !query.isFetchingNextPage && <IndeterminateBar />}
        {query.error ? (
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
