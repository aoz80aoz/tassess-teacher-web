import type { Metadata } from "next";
import { AboutSection } from "@/components/marketing/AboutSection";
import { ContentPageView } from "@/components/marketing/ContentPageView";
import { getContentPage } from "@/server/public-api";
import { S } from "@/lib/strings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: S.seo.aboutTitle,
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const page = await getContentPage("about-us");
  if (!page) return <ContentPageView page={null} fallbackTitle={S.seo.aboutTitle} />;
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <AboutSection page={page} full />
    </div>
  );
}
