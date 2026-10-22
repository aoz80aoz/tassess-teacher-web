import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { site } from "@/lib/site";
import { S } from "@/lib/strings";

export function MarketingFooter() {
  return (
    <footer className="bg-ink text-line-2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-10 text-sm sm:px-6">
        <Logo onDark />
        <nav aria-label={S.marketing.footerNav} className="flex flex-wrap gap-6">
          <Link href="/terms" className="hover:text-white">
            {S.marketing.footerTerms}
          </Link>
          <Link href="/privacy" className="hover:text-white">
            {S.marketing.footerPrivacy}
          </Link>
          <Link href="/contact" className="hover:text-white">
            {S.marketing.footerContact}
          </Link>
          <Link href="/faq" className="hover:text-white">
            {S.marketing.navFaq}
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          {site.appStoreUrl && (
            <a href={site.appStoreUrl} className="rounded-lg border border-white/20 px-3 py-2 hover:text-white" rel="noopener">
              {S.marketing.appStore}
            </a>
          )}
          {site.playStoreUrl && (
            <a href={site.playStoreUrl} className="rounded-lg border border-white/20 px-3 py-2 hover:text-white" rel="noopener">
              {S.marketing.googlePlay}
            </a>
          )}
          <span>{S.marketing.copyright(new Date().getFullYear())}</span>
        </div>
      </div>
    </footer>
  );
}
