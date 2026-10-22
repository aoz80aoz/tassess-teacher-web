import Link from "next/link";
import clsx from "clsx";
import { S } from "@/lib/strings";

// The Hessati mark (public/brand/hessati-mark.png) is drawn as a mask over
// the text color: brand blue on light backgrounds, white on dark ones.
const MARK = "url(/brand/hessati-mark.png)";

export function Logo({ href = "/", onDark = false, withTagline = false }: { href?: string; onDark?: boolean; withTagline?: boolean }) {
  return (
    <Link href={href} aria-label={S.appName} className={clsx("flex items-center gap-3", onDark ? "text-white" : "text-primary")}>
      <span className="block h-10 w-[46px] shrink-0 bg-current" style={{ maskImage: MARK, WebkitMaskImage: MARK, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }} aria-hidden="true" />
      <span className="flex flex-col leading-tight">
        <span className={clsx("text-xl font-bold", onDark ? "text-white" : "text-ink")}>{S.appName}</span>
        {withTagline && <span className={clsx("text-[13px]", onDark ? "text-primary-200" : "text-muted")}>{S.appTagline}</span>}
      </span>
    </Link>
  );
}
