import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Card";
import { money } from "@/lib/format";
import { Icon, type IconName } from "@/components/ui/Icon";
import { AboutSection } from "@/components/marketing/AboutSection";
import { JsonLd } from "@/components/marketing/JsonLd";
import { PricingCatalog } from "@/components/marketing/PricingCatalog";
import { getContentPage, getFrontCatalog } from "@/server/public-api";
import { site } from "@/lib/site";
import { S } from "@/lib/strings";

// Prices come from the public catalog API, refreshed hourly.
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FEATURE_ICONS: Record<string, IconName> = {
  prep: "book",
  run: "play",
  attendance: "userCheck",
  exams: "doc",
  evaluation: "star",
  reports: "chart",
};

const M = S.marketing;

export default async function LandingPage() {
  const [catalog, about] = await Promise.all([getFrontCatalog(), getContentPage("about-us")]);
  // Live numbers from the public catalog (front/stages, classrooms, subjects).
  const grades = catalog?.stages.flatMap((st) => st.grades) ?? [];
  const subjects = grades.flatMap((g) => g.subjects);
  const prices = subjects.flatMap((sub) => sub.plans.map((p) => Number(p.price))).filter((n) => n > 0);
  const lowest = prices.length ? Math.min(...prices) : null;
  // Plan names in catalog order, without repeats (e.g. الخطة الشهرية، الفصلية، السنوية).
  const planNames = [...new Set(subjects.flatMap((sub) => [...sub.plans].sort((a, b) => a.months - b.months).map((p) => p.name)))];
  const faqs = [
    ...M.faqs.slice(0, 2),
    M.faqSubscription(planNames.join("، "), lowest !== null ? money(lowest.toFixed(2)) : null),
    M.faqPayment,
    ...M.faqs.slice(2),
  ];
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: S.appName, url: site.url, logo: `${site.url}/brand/hessati-mark.png` },
            {
              "@type": "SoftwareApplication",
              name: S.appName,
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web, iOS, Android",
              description: S.seo.description,
              inLanguage: "ar",
            },
            {
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ],
        }}
      />

      <section className="bg-primary text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-4 py-16 sm:px-6 lg:py-20">
          <div className="flex flex-[1_1_440px] flex-col gap-6">
            <Chip className="self-start !bg-white/15 !text-white">{M.heroKicker}</Chip>
            <h1 className="text-[34px] font-bold leading-[1.35] sm:text-5xl">{M.heroTitle}</h1>
            <p className="text-lg leading-8 text-primary-200">{M.heroBody}</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/register" variant="accent" size="lg">
                {M.startFree}
              </ButtonLink>
              <ButtonLink href="#how" variant="onDark" size="lg">
                {M.howItWorksCta}
              </ButtonLink>
            </div>
          </div>
          {catalog && (
            <div className="flex flex-[1_1_360px] flex-col gap-4 rounded-3xl bg-white p-6 text-ink shadow-2xl">
              <strong className="text-[17px]">{M.liveTitle}</strong>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                {[
                  { value: catalog.stages.length, label: M.liveStages, tone: "bg-primary-soft" },
                  { value: grades.length, label: M.liveGrades, tone: "bg-accent-soft" },
                  { value: subjects.length, label: M.liveSubjects, tone: "bg-success-soft" },
                ].map((x) => (
                  <div key={x.label} className={`rounded-2xl p-3 ${x.tone}`}>
                    <div className="text-2xl font-bold">{x.value}</div>
                    <div className="text-[13px] leading-5 text-muted">{x.label}</div>
                  </div>
                ))}
              </div>
              <ul className="flex flex-wrap gap-2">
                {catalog.stages.map((st) => (
                  <li key={st.id}>
                    <Chip tone="neutral">{st.name}</Chip>
                  </li>
                ))}
              </ul>
              {lowest !== null && <div className="rounded-2xl bg-surface p-3.5 text-center font-semibold text-primary">{M.liveFrom(money(lowest.toFixed(2)))}</div>}
            </div>
          )}
        </div>
      </section>

      <section id="features" className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-8 px-4 pb-10 pt-20 sm:px-6">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span className="font-semibold text-accent">{M.featuresKicker}</span>
          <h2 className="text-3xl font-bold leading-snug sm:text-4xl">{M.featuresTitle}</h2>
        </div>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {M.features.map((f) => (
            <article key={f.key} className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-7">
              <span className="grid size-13 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon name={FEATURE_ICONS[f.key]} className="size-6" />
              </span>
              <h3 className="text-[19px] font-semibold">{f.title}</h3>
              <p className="leading-8 text-muted">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-8 px-4 py-14 sm:px-6">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span className="font-semibold text-accent">{M.howKicker}</span>
          <h2 className="text-3xl font-bold sm:text-4xl">{M.howTitle}</h2>
        </div>
        <ol className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {M.steps.map((s) => (
            <li key={s.n} className="flex items-start gap-4 rounded-[20px] border border-line bg-white p-7">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-xl font-bold text-white">{s.n}</span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[19px] font-semibold">{s.title}</h3>
                <p className="leading-8 text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="portfolio" className="scroll-mt-24 bg-accent-soft">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-4 py-18 sm:px-6">
          <div className="flex flex-[1_1_420px] flex-col gap-4">
            <span className="font-semibold text-accent">{M.portfolioKicker}</span>
            <h2 className="text-3xl font-bold leading-snug sm:text-4xl">{M.portfolioTitle}</h2>
            <p className="text-[17px] leading-8 text-ink-2">{M.portfolioBody}</p>
          </div>
          <div className="grid flex-[1_1_380px] grid-cols-2 gap-3.5">
            {M.portfolioFolders.map((name) => (
              <div key={name} className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-white p-5">
                <Icon name="folder" className="size-6 text-accent" />
                <div className="font-semibold leading-7">{name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-8 px-4 py-18 sm:px-6">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span className="font-semibold text-accent">{M.pricingKicker}</span>
          <h2 className="text-3xl font-bold sm:text-4xl">{M.pricingTitle}</h2>
          <p className="max-w-2xl text-[17px] leading-8 text-muted">{M.pricingBody}</p>
        </div>
        {catalog ? (
          <PricingCatalog catalog={catalog} />
        ) : (
          <div className="flex justify-center">
            <ButtonLink href="/register" size="lg">
              {M.pricingCta}
            </ButtonLink>
          </div>
        )}
      </section>

      <section id="faq" className="mx-auto flex max-w-3xl scroll-mt-24 flex-col gap-4 px-4 pb-18 sm:px-6">
        <div className="flex flex-col items-center gap-2.5 pb-2 text-center">
          <span className="font-semibold text-accent">{M.faqKicker}</span>
          <h2 className="text-3xl font-bold sm:text-4xl">{M.faqTitle}</h2>
        </div>
        {faqs.map((f, i) => (
          <details key={f.q} open={i === 0} className="group rounded-[20px] border border-line bg-white px-6 py-5 open:border-primary-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
              {f.q}
              <Icon name="chevronDown" className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 leading-8 text-muted">{f.a}</p>
          </details>
        ))}
      </section>

      {about && (
        <section id="about" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-18 sm:px-6">
          <AboutSection page={about} />
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-18 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-primary px-8 py-12 text-white">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold">{M.ctaTitle}</h2>
            <p className="text-[17px] text-primary-200">{M.ctaBody}</p>
          </div>
          <ButtonLink href="/register" variant="accent" size="lg">
            {M.ctaButton}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
