"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import type { Paginate, TransactionSummary } from "@/lib/api/types";
import { formatDate, formatTime } from "@/lib/format";
import { S } from "@/lib/strings";

export default function TransactionsPage() {
  const query = useInfiniteQuery({
    queryKey: [Endpoints.transactions, "infinite"],
    queryFn: ({ pageParam }) => api<{ transactions: TransactionSummary[]; paginate: Paginate }>(Endpoints.transactions, { page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.paginate.current_page < last.paginate.last_page ? last.paginate.current_page + 1 : undefined),
  });
  const list = query.data?.pages.flatMap((p) => p.transactions) ?? [];

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{S.more.transactions}</h2>
      {query.isPending ? (
        <ListSkeleton />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon="card" title={S.more.noTransactions} />
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {list.map((t) => (
              <li key={t.id}>
                <Link href={`/app/more/transactions/${t.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line p-4 hover:border-primary">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon name="card" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block">{S.more.transactionTitle(t.id)}</strong>
                    <span className="text-sm text-muted">
                      {formatDate(t.created_at)} · {formatTime(t.created_at)}
                    </span>
                  </span>
                  {t.discount_percentage !== "0%" && <Chip tone="success">{`${S.more.discountCol} ${t.discount_percentage}`}</Chip>}
                  <strong>{S.subscriptions.priceValue(t.total_amount_with_tax)}</strong>
                  <Icon name="chevronLeft" />
                </Link>
              </li>
            ))}
          </ul>
          {query.hasNextPage && (
            <Button variant="soft" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
              {S.notifications.loadMore}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
