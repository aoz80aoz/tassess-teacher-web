"use client";

import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { ClassroomDetails, SubjectClassrooms } from "@/lib/api/types";
import { S } from "@/lib/strings";
import type { Crumb } from "@/components/ui/PageHeader";

export function useClassroom(id: number) {
  return useApiQuery<ClassroomDetails>(Endpoints.showGroup, { group_id: id });
}

/** Breadcrumbs specialties → subject → classroom (→ page). */
export function useClassroomCrumbs(classroom: ClassroomDetails | undefined, page?: string): Crumb[] {
  const subject = useApiQuery<SubjectClassrooms>(Endpoints.allGroups, { subject_id: classroom?.subject_id }, { enabled: Boolean(classroom) });
  if (!classroom) return [];
  const crumbs: Crumb[] = [
    { label: S.nav.specialties, href: `/app/specialties?category=${classroom.subject_category_id}` },
    { label: subject.data?.subject.name ?? "…", href: `/app/subjects/${classroom.subject_id}` },
  ];
  if (page) crumbs.push({ label: classroom.name, href: `/app/classrooms/${classroom.id}` }, { label: page });
  else crumbs.push({ label: classroom.name });
  return crumbs;
}
