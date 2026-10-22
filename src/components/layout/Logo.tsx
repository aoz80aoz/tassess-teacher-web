import Link from "next/link";
import clsx from "clsx";
import { S } from "@/lib/strings";

export function Logo({ href = "/", onDark = false, withTagline = false }: { href?: string; onDark?: boolean; withTagline?: boolean }) {
  return (
    <Link href={href} className={clsx("flex items-center gap-3", onDark ? "text-white" : "text-ink")}>
      <span className={clsx("grid size-11 place-items-center rounded-xl text-[22px] font-bold", onDark ? "bg-accent-200 text-accent-ink" : "bg-primary text-white")} aria-hidden="true">
        {S.appInitial}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-xl font-bold">{S.appName}</span>
        {withTagline && <span className={clsx("text-[13px]", onDark ? "text-primary-200" : "text-muted")}>{S.appTagline}</span>}
      </span>
    </Link>
  );
}
