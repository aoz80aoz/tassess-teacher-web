import Link from "next/link";
import type { ReactNode } from "react";
import { S } from "@/lib/strings";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({ title, subtitle, crumbs, actions, meta }: { title: ReactNode; subtitle?: ReactNode; crumbs?: Crumb[]; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label={S.common.breadcrumbs}>
            <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {c.href ? (
                    <Link href={c.href} className="text-primary hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="text-[26px] font-bold leading-snug sm:text-[28px]">{title}</h1>
        {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
        {meta}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </header>
  );
}
