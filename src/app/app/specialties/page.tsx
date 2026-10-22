"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, PageSkeleton, Skeleton } from "@/components/ui/States";
import { useSubscriptions } from "@/features/shell/use-teacher";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { CategorySubject } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { S } from "@/lib/strings";

const TINTS = ["bg-primary-soft", "bg-accent-soft", "bg-success-soft", "bg-purple-soft"];

function Subjects({ categoryId, categoryName }: { categoryId: number; categoryName: string }) {
  const [search, setSearch] = useState("");
  const query = useApiQuery<CategorySubject[]>(Endpoints.subjectsByCategory, { subject_category_id: categoryId });
  const list = (query.data ?? []).filter((s) => !search.trim() || s.name.includes(search.trim()));
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{S.specialties.subjectsOf(categoryName)}</h2>
        <label className="flex min-h-11 max-w-sm flex-[1_1_260px] items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-muted">
          <Icon name="search" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={S.specialties.searchSubjects} aria-label={S.specialties.searchSubjects} className="min-w-0 flex-1 bg-transparent text-ink outline-none" />
        </label>
      </div>
      {query.isPending ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon="book" title={S.specialties.noSubjects} />
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {list.map((s, i) => (
            <Link key={s.id} href={`/app/subjects/${s.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 hover:border-primary">
              <span className={clsx("grid size-16 shrink-0 place-items-center rounded-2xl text-[22px] font-bold text-primary", TINTS[i % TINTS.length])} aria-hidden="true">
                {s.name.trim().charAt(0)}
              </span>
              <span className="flex min-w-0 flex-col gap-1.5">
                <strong className="leading-snug">{s.name}</strong>
                <span className="text-sm text-muted">{s.groups_count ? S.home.classesCount(s.groups_count) : S.specialties.noClassrooms}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function SpecialtiesView() {
  const params = useSearchParams();
  const router = useRouter();
  const query = useSubscriptions();
  if (query.isPending) return <PageSkeleton cards={3} />;
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const subs = query.data.subscriptions;
  const pickedId = Number(params.get("category")) || subs[0]?.subject_category_id;
  const picked = subs.find((s) => s.subject_category_id === pickedId) ?? subs[0];

  return (
    <>
      <PageHeader
        title={S.specialties.title}
        subtitle={S.specialties.subtitle}
        actions={
          <ButtonLink href="/app/subscriptions" icon="plus">
            {S.home.addSpecialty}
          </ButtonLink>
        }
      />
      {subs.length === 0 ? (
        <EmptyState icon="layers" title={S.home.noSpecialties} action={<ButtonLink href="/app/subscriptions">{S.nav.subscribeNow}</ButtonLink>} />
      ) : (
        <>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {subs.map((s) => {
              const active = s.subject_category_id === picked?.subject_category_id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => router.replace(`/app/specialties?category=${s.subject_category_id}`, { scroll: false })}
                  className={clsx("flex flex-col gap-3 rounded-2xl border-[1.5px] p-5 text-start", active ? "border-primary bg-primary-soft" : "border-line bg-white hover:border-primary")}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <strong className="text-lg">{s.subject_category.name}</strong>
                    {s.is_valid ? <Chip tone="neutral">{S.home.classesCount(s.groups_count ?? 0)}</Chip> : <Chip tone="danger">{S.specialties.expired}</Chip>}
                  </span>
                  <span className="text-sm text-muted">{s.subject_category.classroom?.name}</span>
                  <span className="text-[13px] text-muted">{S.specialties.expires(formatDate(s.expiry_date))}</span>
                </button>
              );
            })}
          </div>
          {picked && <Subjects categoryId={picked.subject_category_id} categoryName={picked.subject_category.name} />}
        </>
      )}
    </>
  );
}

export default function SpecialtiesPage() {
  return (
    <Suspense fallback={<PageSkeleton cards={3} />}>
      <SpecialtiesView />
    </Suspense>
  );
}

