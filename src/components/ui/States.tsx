import clsx from "clsx";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { S } from "@/lib/strings";
import { errorMessage } from "@/lib/api/client";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-soft", className)} aria-hidden="true" />;
}

/** Page-level skeleton: a header line and a few cards. */
export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label={S.common.loading}>
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5" role="status" aria-label={S.common.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div className={clsx("flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-6 py-12 text-center", className)} role="alert">
      <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
        <Icon name="alert" className="size-7" />
      </span>
      <p className="max-w-md text-ink-2">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" icon="reset" onClick={onRetry}>
          {S.common.retry}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "folder", title, body, action, className }: { icon?: IconName; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-2 bg-white px-6 py-12 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon name={icon} className="size-7" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="max-w-md text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

/** Renders loading / error / content for one query. */
export function QueryView<T>({
  query,
  loading,
  children,
}: {
  query: { data: T | undefined; isPending: boolean; error: unknown; refetch: () => unknown };
  loading?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <>{loading ?? <PageSkeleton />}</>;
  if (query.error || query.data === undefined) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return <>{children(query.data)}</>;
}
