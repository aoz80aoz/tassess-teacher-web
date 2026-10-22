"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import { authPost } from "@/features/auth/auth-api";
import { S } from "@/lib/strings";
import { initialOf, useHome, useTeacher } from "./use-teacher";

const NAV: { href: string; label: string; icon: IconName; exact?: boolean; match?: string[] }[] = [
  { href: "/app", label: S.nav.home, icon: "home", exact: true },
  { href: "/app/specialties", label: S.nav.specialties, icon: "layers", match: ["/app/specialties", "/app/subjects", "/app/classrooms", "/app/sessions"] },
  { href: "/app/reports", label: S.nav.reports, icon: "chart" },
  { href: "/app/portfolio", label: S.nav.portfolio, icon: "folder" },
  { href: "/app/notifications", label: S.nav.notifications, icon: "bell" },
  { href: "/app/subscriptions", label: S.nav.subscriptions, icon: "card" },
  { href: "/app/calendar", label: S.nav.calendar, icon: "calendar" },
  { href: "/app/more", label: S.nav.more, icon: "menu" },
];

function isActive(pathname: string, item: (typeof NAV)[number]) {
  if (item.exact) return pathname === item.href;
  return (item.match ?? [item.href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function PlanCard() {
  const home = useHome();
  const subs = home.data?.subscriptions ?? [];
  const soonest = [...subs].filter((s) => s.is_valid).sort((a, b) => a.remaining_days - b.remaining_days)[0];
  return (
    <div className="mt-8 flex flex-col gap-2.5 rounded-2xl bg-white/10 p-4">
      <div className="font-semibold">{S.nav.currentPlan}</div>
      {soonest ? (
        <>
          <div className="text-[13px] text-primary-200">{soonest.subject_category.name}</div>
          <div className="text-[13px] text-primary-200">{S.nav.endsIn(soonest.remaining_days)}</div>
          <ButtonLink href="/app/subscriptions" variant="accent" size="sm">
            {S.nav.renew}
          </ButtonLink>
        </>
      ) : (
        <>
          <div className="text-[13px] text-primary-200">{S.nav.noPlan}</div>
          <ButtonLink href="/app/subscriptions" variant="accent" size="sm">
            {S.nav.subscribeNow}
          </ButtonLink>
        </>
      )}
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const teacher = useTeacher();
  const home = useHome();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const unread = home.data?.unread_notifications_count ?? 0;

  // Close the phone menu on navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await authPost("logout");
    } finally {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    }
  }

  // Running a session takes the whole screen, like the app.
  if (/^\/app\/sessions\/[^/]+\/run/.test(pathname)) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-wrap items-start gap-6 p-4 sm:p-6">
      <div className="flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-3 lg:hidden">
        <Logo href="/app" onDark />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="dashboard-nav"
          aria-label={menuOpen ? S.common.closeMenu : S.common.openMenu}
          className="grid size-11 place-items-center rounded-xl bg-white/15 text-white"
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
      </div>

      <nav
        id="dashboard-nav"
        aria-label={S.nav.mainNav}
        className={clsx(
          "w-full flex-col gap-1 rounded-[20px] bg-primary px-3.5 py-6 text-white lg:flex lg:w-68 lg:shrink-0",
          menuOpen ? "flex" : "hidden",
        )}
      >
        <div className="hidden px-2.5 pb-6 lg:block">
          <Logo href="/app" onDark withTagline />
        </div>
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] transition-colors",
                active ? "bg-white font-semibold text-primary" : "text-primary-200 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon name={item.icon} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/app/notifications" && unread > 0 && (
                <span className={clsx("rounded-full px-2 text-xs font-bold", active ? "bg-primary text-white" : "bg-accent-200 text-accent-ink")}>{unread}</span>
              )}
            </Link>
          );
        })}
        <button type="button" onClick={() => setConfirmLogout(true)} className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] text-primary-200 hover:bg-white/10 hover:text-white">
          <Icon name="logout" />
          {S.nav.logout}
        </button>
        <PlanCard />
      </nav>

      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
        <div className="hidden items-center justify-end gap-3 lg:flex">
          <Link href="/app/notifications" aria-label={S.nav.unread(unread)} className="relative grid size-11 place-items-center rounded-xl border border-line bg-white text-ink-2 hover:bg-soft">
            <Icon name="bell" />
            {unread > 0 && <span className="absolute end-2.5 top-2 size-2.5 rounded-full border-2 border-white bg-danger" />}
          </Link>
          <Link href="/app/more" className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-soft">
            <span className="text-end">
              <span className="block text-sm font-semibold">{teacher.data?.name}</span>
              <span className="block text-xs text-muted">{teacher.data?.school?.name}</span>
            </span>
            <span className="grid size-11 place-items-center rounded-full bg-accent-200 font-bold text-accent-ink">{initialOf(teacher.data?.name)}</span>
          </Link>
        </div>
        <main id="main" className="flex min-w-0 flex-col gap-6">
          {children}
        </main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={logout}
        loading={loggingOut}
        title={S.more.logoutTitle}
        body={S.more.logoutBody}
        confirmLabel={S.nav.logout}
        danger={false}
      />
    </div>
  );
}
