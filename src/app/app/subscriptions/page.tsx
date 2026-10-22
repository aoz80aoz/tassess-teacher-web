"use client";

import clsx from "clsx";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Chip } from "@/components/ui/Card";
import { Select, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { IndeterminateBar } from "@/components/ui/Progress";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { useSubscriptions } from "@/features/shell/use-teacher";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api/client";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import type { CartView, CatalogCategory, Named } from "@/lib/api/types";
import { formatDate, money } from "@/lib/format";
import { S } from "@/lib/strings";

const SUB = S.subscriptions;
type Gateway = "moyasar" | "tamara";

function Catalog({ cart }: { cart: CartView | undefined }) {
  const toast = useToast();
  const [stageId, setStageId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [months, setMonths] = useState<Record<number, number>>({});
  // The catalog rarely changes: cached for the session.
  const stages = useApiQuery<Named[]>(Endpoints.cartStages, undefined, { staleTime: Infinity });
  const grades = useApiQuery<Named[]>(Endpoints.cartClassrooms, { stage_id: stageId }, { enabled: Boolean(stageId), staleTime: Infinity });
  const categories = useApiQuery<CatalogCategory[]>(Endpoints.cartCategories, { classroom_id: gradeId }, { enabled: Boolean(gradeId), staleTime: Infinity });
  const add = useApiMutation<CartView>(Endpoints.cartAddItem, { invalidates: [Endpoints.cartView] });
  const inCart = new Map((cart?.cart?.items ?? []).map((i) => [i.subject_category_id, i.months]));

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap gap-4">
        <Select wrapperClassName="flex-[1_1_220px]" label={SUB.stage} value={stageId} onChange={(e) => { setStageId(e.target.value); setGradeId(""); }}>
          <option value="">{SUB.chooseStage}</option>
          {(stages.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select wrapperClassName="flex-[1_1_220px]" label={SUB.grade} value={gradeId} disabled={!stageId} onChange={(e) => setGradeId(e.target.value)}>
          <option value="">{SUB.chooseGrade}</option>
          {(grades.data ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </Card>
      {!gradeId ? (
        <EmptyState icon="layers" title={SUB.pickGradeFirst} />
      ) : categories.isPending ? (
        <ListSkeleton rows={3} />
      ) : categories.error ? (
        <ErrorState error={categories.error} onRetry={() => categories.refetch()} />
      ) : (categories.data ?? []).length === 0 ? (
        <EmptyState icon="layers" title={SUB.noCategories} />
      ) : (
        categories.data!.map((c) => {
          const chosen = months[c.id] ?? inCart.get(c.id) ?? c.plans[0]?.months;
          const plan = c.plans.find((p) => p.months === chosen);
          return (
            <Card key={c.id} className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-lg">{c.name}</strong>
                {inCart.has(c.id) && <Chip tone="success">{SUB.inCart}</Chip>}
              </div>
              <div role="radiogroup" aria-label={c.name} className="flex flex-wrap gap-2.5">
                {c.plans.map((p) => (
                  <button
                    key={p.months}
                    type="button"
                    role="radio"
                    aria-checked={p.months === chosen}
                    onClick={() => setMonths({ ...months, [c.id]: p.months })}
                    className={clsx("flex min-w-32 flex-1 flex-col gap-1 rounded-2xl border-[1.5px] p-3.5 text-start", p.months === chosen ? "border-primary bg-primary-soft" : "border-line bg-white")}
                  >
                    <strong>{SUB.month(p.months)}</strong>
                    <span className="font-bold text-primary">{SUB.priceValue(money(p.price))}</span>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                icon="plus"
                className="self-start"
                loading={add.isPending && add.variables?.subject_category_id === c.id}
                onClick={() =>
                  plan &&
                  add.mutate(
                    { subject_category_id: c.id, months: plan.months },
                    {
                      onSuccess: () => {
                        track("add_to_cart", { currency: "SAR", value: Number(plan.price), items: [{ item_id: String(c.id), item_name: c.name, price: Number(plan.price), quantity: 1 }] });
                        toast.show(S.common.addedSuccessfully);
                      },
                      onError: toast.error,
                    },
                  )
                }
              >
                {SUB.addToCart}
              </Button>
            </Card>
          );
        })
      )}
    </div>
  );
}

function Current() {
  const query = useSubscriptions();
  if (query.isPending) return <ListSkeleton rows={3} />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const list = query.data?.subscriptions ?? [];
  if (!list.length) return <EmptyState icon="card" title={SUB.noCurrent} />;
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {list.map((s) => (
        <Card key={s.id} className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <strong className="text-lg">{s.subject_category.name}</strong>
            <Chip tone={s.is_valid ? "success" : "danger"}>{s.is_valid ? SUB.remaining(s.remaining_days) : S.specialties.expired}</Chip>
          </div>
          <span className="text-sm text-muted">{s.subject_category.classroom?.name}</span>
          <span className="text-sm text-muted">{SUB.expiresOn(formatDate(s.expiry_date))}</span>
          <span className="text-sm">{S.home.classesCount(s.groups_count ?? 0)}</span>
        </Card>
      ))}
    </div>
  );
}

function Checkout({ view, loading }: { view: CartView | undefined; loading: boolean }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [gateway, setGateway] = useState<Gateway>("moyasar");
  const [paying, setPaying] = useState(false);
  const coupon = useApiMutation<CartView>(Endpoints.cartApplyOrRemoveCoupon, { invalidates: [Endpoints.cartView] });
  const remove = useApiMutation<CartView>(Endpoints.cartRemoveItem, { invalidates: [Endpoints.cartView] });
  const cart = view?.cart;

  async function pay() {
    if (!cart) return;
    setPaying(true);
    track("begin_checkout", { currency: "SAR", value: cart.total_price, coupon: cart.coupon_code ?? undefined });
    try {
      // Remember the order for the purchase event on the result page.
      sessionStorage.setItem("tt_checkout", JSON.stringify({ value: cart.total_price, coupon: cart.coupon_code, items: cart.items }));
      const { payment_url } = await api<{ payment_url: string }>(Endpoints.cartPay, { gateway, platform: "web" });
      window.location.assign(payment_url);
    } catch (e) {
      toast.error(e);
      setPaying(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6" aria-label={SUB.checkout}>
      <h2 className="text-xl font-semibold">{SUB.checkout}</h2>
      {loading ? (
        <IndeterminateBar />
      ) : !cart ? (
        <div className="py-6 text-center">
          <p className="font-semibold">{SUB.emptyCart}</p>
          <p className="text-sm text-muted">{SUB.emptyCartBody}</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {cart.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5">
                <span>
                  {i.item_name} · {SUB.month(i.months)}
                </span>
                <span className="flex items-center gap-2">
                  <strong>{money(i.item_price)}</strong>
                  <button
                    type="button"
                    aria-label={SUB.removeItem}
                    onClick={() => remove.mutate({ subject_category_id: i.subject_category_id }, { onSuccess: () => track("remove_from_cart", { item_id: String(i.subject_category_id) }), onError: toast.error })}
                    className="grid size-9 place-items-center rounded-lg text-danger hover:bg-danger-soft"
                  >
                    <Icon name="trash" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {cart.coupon_code ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-success-ink">
              <span>{SUB.couponApplied(cart.coupon_code)}</span>
              <Button variant="ghost" size="sm" loading={coupon.isPending} onClick={() => coupon.mutate({ coupon_code: "" }, { onError: toast.error })}>
                {SUB.removeCoupon}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <TextField wrapperClassName="flex-1" aria-label={SUB.couponPlaceholder} placeholder={SUB.couponPlaceholder} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} dir="ltr" />
                <Button variant="outline" disabled={!code.trim()} loading={coupon.isPending} onClick={() => coupon.mutate({ coupon_code: code.trim() }, { onSuccess: () => setCode(""), onError: toast.error })}>
                  {SUB.apply}
                </Button>
              </div>
              {(view?.available_coupons ?? []).length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">{SUB.availableCoupons}:</span>
                  {view!.available_coupons.map((c) => (
                    <button key={c.id} type="button" onClick={() => setCode(c.code)} className="rounded-full border border-dashed border-accent px-3 py-1 font-semibold text-accent" dir="ltr">
                      {c.code}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <dl className="flex flex-col gap-2 border-t border-line pt-4 text-[15px]">
            {[
              [SUB.subtotal, cart.price],
              [SUB.discount, `- ${cart.discount_amount}`],
              [SUB.tax(cart.tax_rate), cart.tax_value],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between">
                <dt className="text-muted">{label}</dt>
                <dd>{SUB.priceValue(String(value))}</dd>
              </div>
            ))}
            <div className="flex justify-between text-lg font-bold">
              <dt>{SUB.total}</dt>
              <dd>{SUB.priceValue(String(cart.total_price))}</dd>
            </div>
          </dl>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-semibold">{SUB.payment}</legend>
            {(["moyasar", "tamara"] as const).map((g) => (
              <label key={g} className={clsx("flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-4", gateway === g ? "border-primary bg-primary-soft" : "border-line")}>
                <input type="radio" name="gateway" className="accent-primary" checked={gateway === g} onChange={() => setGateway(g)} />
                {g === "moyasar" ? SUB.payCard : SUB.payTamara}
              </label>
            ))}
          </fieldset>
          <Button variant="accent" size="lg" loading={paying} onClick={pay}>
            {paying ? SUB.redirecting : SUB.checkout}
          </Button>
        </>
      )}
    </Card>
  );
}

export default function SubscriptionsPage() {
  const [tab, setTab] = useState<"new" | "current">("new");
  const cart = useApiQuery<CartView>(Endpoints.cartView);
  return (
    <>
      <PageHeader
        title={SUB.title}
        actions={
          <Tabs
            label={SUB.title}
            value={tab}
            onChange={setTab}
            items={[
              { key: "new", label: SUB.newTab },
              { key: "current", label: SUB.currentTab },
            ]}
          />
        }
      />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-5">
          {tab === "new" ? <Catalog cart={cart.data} /> : <Current />}
        </div>
        <div className="flex-[1_1_320px]">
          <Checkout view={cart.data} loading={cart.isPending} />
        </div>
      </div>
    </>
  );
}
