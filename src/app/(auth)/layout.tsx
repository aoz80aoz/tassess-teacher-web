import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import { S } from "@/lib/strings";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

// Phone: a slim top bar, then the form right away. Large screens: the
// brand panel beside the form.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
        <Logo />
        <Link href="/" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">
          {S.errors.backHome}
          <Icon name="chevronLeft" className="size-4" />
        </Link>
      </header>
      <section className="hidden flex-col justify-between gap-10 bg-primary p-14 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[44%] lg:shrink-0">
        <Logo onDark />
        <div className="flex max-w-lg flex-col gap-4">
          <h2 className="text-4xl font-bold leading-snug">{S.auth.welcome}</h2>
          <p className="text-lg leading-8 text-primary-200">{S.auth.welcomeBody}</p>
        </div>
        <ul className="flex flex-col gap-3 text-[15px] text-primary-200">
          {[S.auth.benefitPhone, S.auth.benefitDevices].map((b) => (
            <li key={b} className="flex items-center gap-2.5">
              <Icon name="check" className="size-5 text-accent-200" strokeWidth={2} />
              {b}
            </li>
          ))}
        </ul>
      </section>
      <main id="main" className="flex min-w-0 flex-1 justify-center px-4 pb-28 pt-6 sm:px-6 sm:pt-10 lg:items-center lg:pb-12">
        {children}
      </main>
    </div>
  );
}
