"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState, QueryView } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { Coupon, UsedCoupon } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { S } from "@/lib/strings";

export default function CouponsPage() {
  const toast = useToast();
  const query = useApiQuery<{ active: Coupon[]; used: UsedCoupon[] }>(Endpoints.myCoupons);
  const [tab, setTab] = useState<"active" | "used">("active");
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{S.more.coupons}</h2>
        <Tabs
          label={S.more.coupons}
          value={tab}
          onChange={setTab}
          items={[
            { key: "active", label: S.more.activeCoupons },
            { key: "used", label: S.more.usedCoupons },
          ]}
        />
      </div>
      <QueryView query={query}>
        {(d) =>
          (tab === "active" ? d.active : d.used).length === 0 ? (
            <EmptyState icon="ticket" title={S.more.noCoupons} />
          ) : (
            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
              {tab === "active"
                ? d.active.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => navigator.clipboard.writeText(c.code).then(() => toast.show(S.common.copied))}
                      className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-dashed border-accent bg-accent-soft p-5 text-start"
                      aria-label={`${S.common.copy} ${c.code}`}
                    >
                      <strong className="text-xl tracking-wider" dir="ltr">
                        {c.code}
                      </strong>
                      <span className="text-accent-ink">{S.more.couponValue(c.value, c.type)}</span>
                      <span className="text-sm text-muted">{S.more.couponEnds(formatDate(c.expires_at))}</span>
                    </button>
                  ))
                : d.used.map((c) => (
                    <div key={c.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
                      <strong className="text-xl tracking-wider text-muted" dir="ltr">
                        {c.code}
                      </strong>
                      <span>{S.more.couponSaved(c.discount_amount)}</span>
                      <span className="text-sm text-muted">{formatDate(c.used_at)}</span>
                    </div>
                  ))}
            </div>
          )
        }
      </QueryView>
    </Card>
  );
}
