"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { DatabaseStudentsDialog, ExcelStudentsDialog, ManualStudentDialog } from "@/features/classroom/AddStudentsDialogs";
import { useClassroom, useClassroomCrumbs } from "@/features/classroom/use-classroom";
import { ExportDialog } from "@/features/common/ExportDialog";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { RankedStudent } from "@/lib/api/types";
import { saveCsv, stamp } from "@/lib/download";
import { percent } from "@/lib/format";
import { S } from "@/lib/strings";

type DialogKind = "manual" | "excel" | "database" | "export" | "deleteAll" | null;

export default function ClassroomStudentsPage() {
  const { id } = useParams<{ id: string }>();
  const classroomId = Number(id);
  const toast = useToast();
  const classroom = useClassroom(classroomId);
  const crumbs = useClassroomCrumbs(classroom.data, S.classroom.tileStudents);
  // `groups/students` returns the whole classroom at once: search and
  // exports always see every student.
  const query = useApiQuery<RankedStudent[]>(Endpoints.getGroupStudents, { group_id: classroomId, type: "performance" });
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const deleteAll = useApiMutation(Endpoints.deleteAllStudents, { invalidates: [Endpoints.getGroupStudents, Endpoints.showGroup, Endpoints.allGroups] });

  const all = [...(query.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const q = search.trim();
  const list = q ? all.filter((s) => s.name.includes(q) || String(s.phone ?? "").includes(q)) : all;

  const methods: { kind: DialogKind; title: string; sub: string; icon: IconName }[] = [
    { kind: "manual", title: S.students.manual, sub: S.students.manualSub, icon: "plus" },
    { kind: "excel", title: S.students.excel, sub: S.students.excelSub, icon: "sheet" },
    { kind: "database", title: S.students.database, sub: S.students.databaseSub, icon: "database" },
  ];

  const exportReport = () =>
    saveCsv(
      [[S.students.name, S.students.phone, S.students.performance], ...all.map((s) => [s.name, s.phone ?? "", percent(s.performance_rate as number)])],
      `classroom_students_${stamp()}`,
    );

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={
          <>
            {S.students.title} <span className="text-lg font-normal text-muted">({all.length})</span>
          </>
        }
        actions={
          <>
            <Button variant="accent" icon="download" disabled={!all.length} onClick={() => setDialog("export")}>
              {S.students.exportReport}
            </Button>
            <Button variant="danger" icon="trash" disabled={!all.length} onClick={() => setDialog("deleteAll")}>
              {S.students.deleteAll}
            </Button>
          </>
        }
      />

      <Card className="flex flex-col gap-3.5">
        <h2 className="text-lg font-semibold">{S.students.addTitle}</h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {methods.map((m) => (
            <button key={m.title} type="button" onClick={() => setDialog(m.kind)} className="flex min-h-18 items-center gap-3.5 rounded-2xl border-[1.5px] border-dashed border-line-2 bg-white p-4 text-start hover:border-primary">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon name={m.icon} />
              </span>
              <span className="flex flex-col gap-0.5">
                <strong>{m.title}</strong>
                <span className="text-sm text-muted">{m.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-h-11 max-w-md flex-[1_1_260px] items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-muted">
            <Icon name="search" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={S.students.search} aria-label={S.students.search} className="min-w-0 flex-1 bg-transparent text-ink outline-none" />
          </label>
          <span className="text-sm text-muted">{S.students.clickHint}</span>
        </div>
        {query.isPending ? (
          <ListSkeleton rows={6} />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : all.length === 0 ? (
          <EmptyState icon="users" title={S.students.noStudents} body={S.students.noStudentsBody} />
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-muted">{S.students.noResults}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-[15px]">
              <thead>
                <tr className="text-sm text-muted">
                  <th className="px-4 py-1 text-start font-medium">#</th>
                  <th className="px-4 py-1 text-start font-medium">{S.students.name}</th>
                  <th className="px-4 py-1 text-start font-medium">{S.students.phone}</th>
                  <th className="px-4 py-1 text-start font-medium">{S.students.performance}</th>
                  <th className="px-4 py-1">
                    <span className="sr-only">{S.common.open}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => (
                  <tr key={s.id}>
                    <td className="rounded-s-xl bg-soft px-4 py-3.5 text-muted">{i + 1}</td>
                    <td className="bg-soft px-4 py-3.5 font-semibold whitespace-nowrap">{s.name}</td>
                    <td className="bg-soft px-4 py-3.5 whitespace-nowrap" dir="ltr">
                      <span className="block text-end">{s.phone}</span>
                    </td>
                    <td className="bg-soft px-4 py-3.5">{percent(s.performance_rate as number)}</td>
                    <td className="w-14 rounded-e-xl bg-soft px-3 py-2 text-end">
                      <Link href={`/app/classrooms/${classroomId}/students/${s.id}`} aria-label={S.students.open(s.name)} className="inline-grid size-10 place-items-center rounded-[10px] bg-white text-primary hover:bg-primary-soft">
                        <Icon name="chevronLeft" strokeWidth={2} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ManualStudentDialog open={dialog === "manual"} onClose={() => setDialog(null)} classroomId={classroomId} />
      <ExcelStudentsDialog open={dialog === "excel"} onClose={() => setDialog(null)} classroomId={classroomId} />
      <DatabaseStudentsDialog open={dialog === "database"} onClose={() => setDialog(null)} classroomId={classroomId} />
      <ExportDialog open={dialog === "export"} onClose={() => setDialog(null)} classroomId={classroomId} studentIds={all.map((s) => s.id)} onExportReport={exportReport} filePrefix="classroom" />
      <ConfirmDialog
        open={dialog === "deleteAll"}
        onClose={() => setDialog(null)}
        loading={deleteAll.isPending}
        title={S.students.deleteAll}
        body={S.students.deleteAllBody}
        onConfirm={() =>
          deleteAll.mutate(
            { group_id: classroomId },
            {
              onSuccess: () => {
                setDialog(null);
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
