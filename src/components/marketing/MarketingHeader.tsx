"use client";

import Link from "next/link";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import { track } from "@/lib/analytics";
import { S } from "@/lib/strings";

const LINKS = [
  { href: "/#features", label: S.marketing.navFeatures },
  { href: "/#how", label: S.marketing.navHow },
  { href: "/#portfolio", label: S.marketing.navPortfolio },
  { href: "/#pricing", label: S.marketing.navPricing },
  { href: "/faq", label: S.marketing.navFaq },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label={S.marketing.sectionsNav} className="hidden gap-7 text-[15px] lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink-2 hover:text-primary">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden gap-2.5 sm:flex">
          <ButtonLink href="/login" variant="outline">
            {S.marketing.login}
          </ButtonLink>
          <ButtonLink href="/register" onClick={() => track("cta_click", { location: "header" })}>
            {S.marketing.startNow}
          </ButtonLink>
        </div>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl border border-line lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? S.common.closeMenu : S.common.openMenu}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label={S.marketing.sectionsNav} className="flex flex-col gap-1 border-t border-line px-4 pb-4 pt-2 lg:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-3 text-ink-2 hover:bg-soft" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
            <ButtonLink href="/login" variant="outline">
              {S.marketing.login}
            </ButtonLink>
            <ButtonLink href="/register">{S.marketing.startNow}</ButtonLink>
          </div>
        </nav>
      )}
    </header>
  );
}
