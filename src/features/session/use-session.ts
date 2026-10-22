"use client";

import { useClassroom } from "@/features/classroom/use-classroom";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { Session } from "@/lib/api/types";
import { parseApiDate } from "@/lib/format";
import { S } from "@/lib/strings";
import type { Crumb } from "@/components/ui/PageHeader";

export function useSession(id: number) {
  return useApiQuery<Session>(Endpoints.classSessionShow, { session_id: id });
}

export function useSessionCrumbs(session: Session | undefined, page?: string): Crumb[] {
  const classroom = useClassroom(session?.group_id ?? 0);
  if (!session) return [];
  const crumbs: Crumb[] = [
    { label: S.nav.specialties, href: "/app/specialties" },
    { label: classroom.data?.name ?? "…", href: `/app/classrooms/${session.group_id}` },
  ];
  if (page) crumbs.push({ label: session.name, href: `/app/sessions/${session.id}` }, { label: page });
  else crumbs.push({ label: session.name });
  return crumbs;
}

/** A session can be edited until it starts (the backend refuses a past start). */
export function isEditable(session: Session) {
  const start = parseApiDate(session.starts_at);
  return session.status === "pending" && Boolean(start && start.getTime() > Date.now());
}

/** Attendance can be saved once the session started (or was run early). */
export function canTakeAttendance(session: Session) {
  if (session.status !== "pending") return true;
  const start = parseApiDate(session.starts_at);
  return Boolean(start && start.getTime() <= Date.now());
}
