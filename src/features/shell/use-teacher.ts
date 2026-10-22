"use client";

import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { HomeData, Subscription, Teacher } from "@/lib/api/types";

export function useTeacher() {
  return useApiQuery<Teacher>(Endpoints.getTeacherProfile, undefined, { staleTime: 5 * 60_000 });
}

export function useHome() {
  return useApiQuery<HomeData>(Endpoints.home);
}

export function useSubscriptions() {
  return useApiQuery<{ subscriptions: Subscription[] }>(Endpoints.mySubscriptions, { page: 1, per_page: 100 });
}

export function initialOf(name: string | undefined) {
  return name?.trim().charAt(0) ?? "";
}
