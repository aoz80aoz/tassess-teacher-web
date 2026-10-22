"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryView } from "@/components/ui/States";
import { AttendancePanel } from "@/features/session/AttendancePanel";
import { useSession, useSessionCrumbs } from "@/features/session/use-session";
import { formatDate, formatTime } from "@/lib/format";
import { S } from "@/lib/strings";

export default function AttendancePage() {
  const { id } = useParams<{ id: string }>();
  const query = useSession(Number(id));
  const crumbs = useSessionCrumbs(query.data, S.attendance.title);
  return (
    <QueryView query={query}>
      {(s) => (
        <>
          <PageHeader crumbs={crumbs} title={S.attendance.title} subtitle={`${s.lesson_name ?? s.name} · ${formatDate(s.starts_at, true)} · ${formatTime(s.starts_at)}`} />
          <AttendancePanel session={s} />
        </>
      )}
    </QueryView>
  );
}
