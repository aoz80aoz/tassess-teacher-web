"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryView } from "@/components/ui/States";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { TransactionDetails } from "@/lib/api/types";
import { formatDate, formatTime } from "@/lib/format";
import { S } from "@/lib/strings";

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const query = useApiQuery<TransactionDetails>(Endpoints.transactionDetails, { transaction_id: Number(id) });
  const price = S.subscriptions.priceValue;
  return (
    <QueryView query={query}>
      {(t) => (
        <>
          <PageHeader
            crumbs={[{ label: S.more.transactions, href: "/app/more/transactions" }, { label: S.more.transactionTitle(t.id) }]}
            title={S.more.transactionTitle(t.id)}
            actions={
              <Button variant="outline" icon="print" onClick={() => window.print()}>
                {S.more.printInvoice}
              </Button>
            }
          />
          <Card className="flex flex-col gap-5 p-7">
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                [S.more.date, `${formatDate(t.created_at)} · ${formatTime(t.created_at)}`],
                [S.more.gateway, t.gateway],
                [S.more.invoice, t.transaction_id],
                [S.students.name, t.teacher_name],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-surface px-4 py-3">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="break-all font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-2">
              <strong>{S.more.items}</strong>
              {t.items.map((i) => (
                <div key={i.id} className="flex justify-between rounded-xl border border-line px-4 py-3">
                  <span>
                    {i.item_name} · {S.subscriptions.month(i.months)}
                  </span>
                  <strong>{price(i.item_price)}</strong>
                </div>
              ))}
            </div>
            <dl className="flex flex-col gap-2 border-t border-line pt-4">
              {[
                [S.subscriptions.subtotal, t.amount],
                ...(Number(t.coupon_discount) > 0 ? [[`${S.subscriptions.discount}${t.coupon ? ` (${t.coupon})` : ""}`, `- ${t.coupon_discount}`]] : []),
                [S.subscriptions.tax(t.tax_rate), t.tax_value],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted">{label}</dt>
                  <dd>{price(value)}</dd>
                </div>
              ))}
              <div className="flex justify-between text-lg font-bold">
                <dt>{S.subscriptions.total}</dt>
                <dd>{price(t.total_amount_with_tax)}</dd>
              </div>
            </dl>
          </Card>
        </>
      )}
    </QueryView>
  );
}
