"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { S } from "@/lib/strings";

const MENU: { href: string; label: string; icon: IconName }[] = [
  { href: "/app/more", label: S.more.profile, icon: "user" },
  { href: "/app/more/transactions", label: S.more.transactions, icon: "card" },
  { href: "/app/more/coupons", label: S.more.coupons, icon: "ticket" },
  { href: "/app/more/help", label: S.more.help, icon: "chat" },
  { href: "/app/more/faq", label: S.more.faq, icon: "help" },
  { href: "/app/more/contact", label: S.more.contact, icon: "mail" },
  { href: "/app/more/terms", label: S.more.terms, icon: "file" },
  { href: "/app/more/privacy", label: S.more.privacy, icon: "shield" },
];

export default function MoreLayout({ children }: LayoutProps<"/app/more">) {
  const pathname = usePathname();
  return (
    <>
      <h1 className="text-[28px] font-bold">{S.more.title}</h1>
      <div className="flex flex-wrap items-start gap-6">
        <nav aria-label={S.more.settings} className="flex flex-[1_1_240px] flex-col gap-0.5 rounded-2xl border border-line bg-white p-2.5 lg:max-w-75">
          {MENU.map((m) => {
            const active = m.href === "/app/more" ? pathname === m.href : pathname.startsWith(m.href);
            return (
              <Link key={m.href} href={m.href} aria-current={active ? "page" : undefined} className={clsx("flex min-h-12 items-center gap-3 rounded-xl px-3.5", active ? "bg-primary-soft font-semibold text-primary" : "hover:bg-soft")}>
                <Icon name={m.icon} />
                {m.label}
              </Link>
            );
          })}
        </nav>
        <section className="flex min-w-0 flex-[3_1_460px] flex-col gap-5">{children}</section>
      </div>
    </>
  );
}
