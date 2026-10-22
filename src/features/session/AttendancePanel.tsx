"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, StatTile } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { Segmented } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { AttendanceData, Session } from "@/lib/api/types";
import { saveCsv, stamp } from "@/lib/download";
import { parseApiDate, percent, toRequestDateTime } from "@/lib/format";
import { S } from "@/lib/strings";
import { canTakeAttendance } from "./use-session";

type Status = "present" | "absent" | "late";
interface Row {
  status: Status;
  arrivedAt: string | null; // HH:MM, late only
}

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function AttendancePanel({ session }: { session: Session }) {
  const toast = useToast();
  const query = useApiQuery<AttendanceData>(Endpoints.classSessionAttendanceStudents, { session_id: session.id });
  const save = useApiMutation(Endpoints.classSessionAttendanceAdd, { invalidates: [Endpoints.classSessionAttendanceStudents, Endpoints.classSessionShow, Endpoints.showGroup] });
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [saved, setSaved] = useState<Record<number, Row>>({});
  const [search, setSearch] = useState("");
  const canSave = canTakeAttendance(session);
  const start = parseApiDate(session.started_at ?? session.starts_at) ?? new Date();

  useEffect(() => {
    if (!query.data) return;
    const loaded: Record<number, Row> = {};
    for (const s of query.data.students) {
      // Not taken yet: everyone starts as present, the common case.
      const taken = query.data.statistics.attendance === 1;
      const status: Status = !taken ? "present" : !s.is_present ? "absent" : s.is_late ? "late" : "present";
      const arrived = parseApiDate(s.present_at);
      loaded[s.student_id] = { status, arrivedAt: status === "late" && arrived ? hhmm(arrived) : null };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(loaded);
    setSaved(loaded);
  }, [query.data]);

  const dirty = useMemo(() => JSON.stringify(rows) !== JSON.stringify(saved), [rows, saved]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (query.isPending) return <ListSkeleton rows={6} />;
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const students = query.data.students;
  if (students.length === 0) {
    return <EmptyState icon="users" title={S.attendance.noStudents} action={<ButtonLink href={`/app/classrooms/${session.group_id}/students`}>{S.attendance.addStudents}</ButtonLink>} />;
  }

  const setStatus = (id: number, status: Status) =>
    setRows((r) => ({ ...r, [id]: { status, arrivedAt: status === "late" ? r[id]?.arrivedAt ?? hhmm(new Date(Math.max(start.getTime(), Math.min(Date.now(), start.getTime() + 10 * 60_000)))) : null } }));
  const tally = { present: 0, late: 0, absent: 0 };
  for (const r of Object.values(rows)) tally[r.status]++;
  const q = search.trim();
  const visible = students.filter((s) => !q || s.student_name.includes(q));
  const late = visible.filter((s) => rows[s.student_id]?.status === "late");
  const others = visible.filter((s) => rows[s.student_id]?.status !== "late");

  function submit() {
    // Every save sends the whole classroom.
    const payload = students.map((s) => {
      const r = rows[s.student_id];
      const entry: Record<string, unknown> = { student_id: s.student_id, is_present: r.status !== "absent", is_late: r.status === "late" };
      if (r.status === "late" && r.arrivedAt) {
        const [h, m] = r.arrivedAt.split(":").map(Number);
        const at = new Date(start);
        at.setHours(h, m, 0, 0);
        entry.present_at = toRequestDateTime(at);
      }
      return entry;
    });
    save.mutate({ session_id: session.id, students: payload }, { onSuccess: () => toast.show(S.attendance.saved), onError: toast.error });
  }

  const exportSheet = () =>
    saveCsv(
      [[S.students.name, S.attendance.title, S.attendance.arrivalTime], ...students.map((s) => [s.student_name, S.attendance[rows[s.student_id]?.status ?? "absent"], rows[s.student_id]?.arrivedAt ?? ""])],
      `attendance_${session.id}_${stamp()}`,
    );

  const row = (s: (typeof students)[number]) => {
    const r = rows[s.student_id];
    return (
      <div key={s.student_id} className={`flex flex-wrap items-center gap-3.5 rounded-2xl border px-4 py-3 ${r?.status === "late" ? "border-accent-200 bg-accent-soft" : "border-line bg-white"}`}>
        <div className="min-w-0 flex-[1_1_200px]">
          <strong>{s.student_name}</strong>
          <div className="text-sm text-muted">{S.attendance.performance(percent(s.performance_rate))}</div>
        </div>
        {r?.status === "late" && (
          <label className="flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-sm text-warning-ink">
            {S.attendance.arrivalTime}
            <input type="time" value={r.arrivedAt ?? ""} onChange={(e) => setRows({ ...rows, [s.student_id]: { ...r, arrivedAt: e.target.value } })} className="bg-transparent font-semibold outline-none" dir="ltr" />
          </label>
        )}
        <Segmented
          label={s.student_name}
          value={r?.status ?? null}
          onChange={(v) => setStatus(s.student_id, v)}
          options={[
            { key: "present", label: S.attendance.present, activeClass: "bg-success" },
            { key: "absent", label: S.attendance.absent, activeClass: "bg-danger" },
            { key: "late", label: S.attendance.late, activeClass: "bg-accent" },
          ]}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <StatTile label={S.attendance.present} value={tally.present} tone="success" />
        <StatTile label={S.attendance.late} value={tally.late} tone="warning" />
        <StatTile label={S.attendance.absent} value={tally.absent} tone="danger" />
        <StatTile label={S.attendance.total} value={students.length} />
      </div>
      {!canSave && <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-ink">{S.attendance.beforeStart}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 max-w-sm flex-[1_1_240px] items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-muted">
          <Icon name="search" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={S.students.search} aria-label={S.students.search} className="min-w-0 flex-1 bg-transparent text-ink outline-none" />
        </label>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            icon="userCheck"
            onClick={() => setRows((rs) => Object.fromEntries(Object.entries(rs).map(([id, r]) => [id, r.status === "absent" ? { status: "present", arrivedAt: null } : r])))}
          >
            {S.attendance.markAll}
          </Button>
          <Button variant="accent" icon="download" onClick={exportSheet}>
            {S.attendance.exportSheet}
          </Button>
          <Button icon="save" loading={save.isPending} disabled={!canSave} onClick={submit}>
            {S.attendance.save}
          </Button>
        </div>
      </div>
      {dirty && <p className="text-sm text-accent">{S.attendance.unsaved}</p>}
      {late.length > 0 && (
        <Card className="flex flex-col gap-2.5 border-0 bg-transparent p-0">
          <h3 className="font-semibold">{S.attendance.lateSection}</h3>
          {late.map(row)}
        </Card>
      )}
      <div className="flex flex-col gap-2.5">
        <h3 className="font-semibold">{S.attendance.studentsSection}</h3>
        {others.map(row)}
      </div>
    </div>
  );
}

