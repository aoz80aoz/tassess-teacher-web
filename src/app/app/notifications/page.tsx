"use client";

import clsx from "clsx";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import type { AppNotification, NotificationsPage } from "@/lib/api/types";
import { formatDate, formatHijri, formatTime } from "@/lib/format";
import { fileUrl } from "@/lib/site";
import { S } from "@/lib/strings";

type Tab = "all" | "unread";

export default function NotificationsPageView() {
  const [tab, setTab] = useState<Tab>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<"one" | "all" | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const endpoint = tab === "all" ? Endpoints.allNotifications : Endpoints.unreadNotifications;

  const query = useInfiniteQuery({
    queryKey: [endpoint, "infinite"],
    queryFn: ({ pageParam }) => api<NotificationsPage>(endpoint, { page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.paginate.current_page < last.paginate.last_page ? last.paginate.current_page + 1 : undefined),
  });

  const items = query.data?.pages.flatMap((p) => p.notifications) ?? [];
  const unread = query.data?.pages[0]?.unread_notifications_count ?? items.filter((n) => !n.read_at).length;
  const selected = items.find((n) => n.id === selectedId) ?? null;

  const refresh = () =>
    Promise.all([Endpoints.allNotifications, Endpoints.unreadNotifications, Endpoints.home].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));

  async function open(n: AppNotification) {
    setSelectedId(n.id);
    if (!n.read_at) {
      await api(Endpoints.markNotificationAsRead, { notification_id: n.id }).catch(() => null);
      refresh();
    }
  }

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      await refresh();
      toast.show(message);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <>
      <PageHeader
        title={S.notifications.title}
        subtitle={S.notifications.unreadCount(unread)}
        actions={
          <>
            <Button variant="outline" icon="check" disabled={!unread} loading={busy && confirm === null} onClick={() => run(() => api(Endpoints.markAllNotificationsRead), S.common.savedSuccessfully)}>
              {S.notifications.markAll}
            </Button>
            <Button variant="danger" icon="trash" disabled={!items.length} onClick={() => setConfirm("all")}>
              {S.notifications.deleteAll}
            </Button>
          </>
        }
      />
      <Tabs
        className="self-start"
        label={S.notifications.title}
        value={tab}
        onChange={(t) => {
          setTab(t);
          setSelectedId(null);
        }}
        items={[
          { key: "all", label: S.notifications.tabAll },
          { key: "unread", label: S.notifications.tabUnread },
        ]}
      />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-2.5">
          {query.isPending ? (
            <ListSkeleton />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState icon="bell" title={S.notifications.none} />
          ) : (
            <>
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => open(n)}
                  className={clsx("flex w-full gap-3.5 rounded-2xl border p-4 text-start", n.id === selectedId ? "border-primary bg-primary-soft" : "border-line bg-white hover:border-primary")}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Icon name="bell" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex justify-between gap-2">
                      <strong className="text-[15px]">{n.title}</strong>
                      {!n.read_at && <span aria-label={S.notifications.unread} className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent" />}
                    </span>
                    <span className="truncate text-sm text-muted">{n.body}</span>
                    <span className="text-xs text-muted">
                      {formatDate(n.created_at)} · {formatTime(n.created_at)}
                    </span>
                  </span>
                </button>
              ))}
              {query.hasNextPage && (
                <Button variant="soft" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                  {S.notifications.loadMore}
                </Button>
              )}
            </>
          )}
        </div>
        <Card className="flex min-w-0 flex-[1.4_1_420px] flex-col gap-4 p-7">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-[22px] font-semibold leading-relaxed">{selected.title}</h2>
                <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirm("one")}>
                  {S.common.delete}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip tone="neutral">{formatHijri(selected.created_at)}</Chip>
                <Chip tone="neutral">{formatDate(selected.created_at)}</Chip>
                <Chip tone="neutral">{formatTime(selected.created_at)}</Chip>
              </div>
              {selected.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(selected.image)!} alt="" className="max-h-80 w-full rounded-2xl object-cover" />
              )}
              <p className="whitespace-pre-line text-base leading-8 text-ink-2">{selected.body}</p>
            </>
          ) : (
            <p className="py-16 text-center text-muted">{S.notifications.select}</p>
          )}
        </Card>
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        loading={busy}
        title={S.common.confirmDeleteTitle}
        body={confirm === "all" ? S.notifications.deleteAllBody : selected?.title}
        onConfirm={() =>
          confirm === "all"
            ? run(() => api(Endpoints.deleteAllNotifications), S.common.deletedSuccessfully).then(() => setSelectedId(null))
            : selected && run(() => api(Endpoints.deleteNotification, { notification_id: selected.id }), S.common.deletedSuccessfully).then(() => setSelectedId(null))
        }
      />
    </>
  );
}
