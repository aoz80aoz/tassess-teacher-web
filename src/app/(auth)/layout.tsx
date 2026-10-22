import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import { S } from "@/lib/strings";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-wrap">
      <section className="flex flex-[1_1_420px] flex-col justify-between gap-10 bg-primary p-8 text-white sm:p-14">
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
      <main id="main" className="grid flex-[1_1_480px] place-items-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
