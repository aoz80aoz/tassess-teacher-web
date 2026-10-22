"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";
import { Endpoints } from "@/lib/api/endpoints";
import { S } from "@/lib/strings";

// The payment gateway sends the teacher back here. `status=paid` comes from
// the backend's callback redirect for the web.

function Result() {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const paid = params.get("status") === "paid";
  const tracked = useRef(false);

  useEffect(() => {
    if (!paid || tracked.current) return;
    tracked.current = true;
    try {
      const order = JSON.parse(sessionStorage.getItem("tt_checkout") ?? "null") as { value: number; coupon: string | null; items: { subject_category_id: number; item_name: string; item_price: string }[] } | null;
      if (order) {
        track("purchase", {
          transaction_id: params.get("id") ?? `web-${Date.now()}`,
          currency: "SAR",
          value: order.value,
          coupon: order.coupon ?? undefined,
          items: order.items.map((i) => ({ item_id: String(i.subject_category_id), item_name: i.item_name, price: Number(i.item_price), quantity: 1 })),
        });
        sessionStorage.removeItem("tt_checkout");
      }
    } catch {}
    for (const key of [Endpoints.cartView, Endpoints.mySubscriptions, Endpoints.home, Endpoints.getTeacherProfile, Endpoints.transactions]) queryClient.invalidateQueries({ queryKey: [key] });
  }, [paid, params, queryClient]);

  return (
    <Card className="mx-auto mt-10 flex w-full max-w-lg flex-col items-center gap-4 p-10 text-center">
      <span className={`grid size-18 place-items-center rounded-full ${paid ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
        <Icon name={paid ? "check" : "alert"} className="size-9" strokeWidth={2.2} />
      </span>
      <h1 className="text-2xl font-bold">{paid ? S.subscriptions.resultSuccess : S.subscriptions.resultFailed}</h1>
      <p className="leading-7 text-muted">{paid ? S.subscriptions.resultSuccessBody : S.subscriptions.resultFailedBody}</p>
      {paid ? <ButtonLink href="/app">{S.subscriptions.goHome}</ButtonLink> : <ButtonLink href="/app/subscriptions">{S.subscriptions.backToCheckout}</ButtonLink>}
    </Card>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense>
      <Result />
    </Suspense>
  );
}
