"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { api, type ApiBody } from "./client";

// One query key per endpoint + body, so invalidating an endpoint refreshes
// every screen that reads it (like DataChangeBus in the app).

export function apiKey(path: string, body?: Record<string, unknown>) {
  return body ? [path, body] : [path];
}

export function useApiQuery<T>(
  path: string,
  body?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  return useQuery<T>({
    queryKey: apiKey(path, body),
    queryFn: () => api<T>(path, body),
    ...options,
  });
}

interface MutationOptions<T> {
  /** Endpoints whose cached reads become stale after a success. */
  invalidates?: string[];
  onSuccess?: (data: T) => void;
}

export function useApiMutation<T = unknown, B extends ApiBody = Record<string, unknown>>(
  path: string,
  options: MutationOptions<T> = {},
) {
  const queryClient = useQueryClient();
  return useMutation<T, Error, B>({
    mutationFn: (body: B) => api<T>(path, body),
    onSuccess: async (data) => {
      await Promise.all(
        (options.invalidates ?? []).map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      );
      options.onSuccess?.(data);
    },
  });
}
