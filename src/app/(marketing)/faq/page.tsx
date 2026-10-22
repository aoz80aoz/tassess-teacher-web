import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/marketing/JsonLd";
import { S } from "@/lib/strings";

export const metadata: Metadata = {
  title: S.seo.faqTitle,
  description: S.seo.faqDescription,
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const faqs = S.marketing.faqs;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-14 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <h1 className="text-center text-4xl font-bold">{S.seo.faqTitle}</h1>
      {faqs.map((f) => (
        <details key={f.q} className="rounded-[20px] border border-line bg-white px-6 py-5">
          <summary className="cursor-pointer text-[17px] font-semibold">{f.q}</summary>
          <p className="mt-3 leading-8 text-muted">{f.a}</p>
        </details>
      ))}
      <ButtonLink href="/register" className="self-center">
        {S.marketing.ctaButton}
      </ButtonLink>
    </div>
  );
}
