import type { Metadata } from "next";
import { ContentPageView } from "@/components/marketing/ContentPageView";
import { getContentPage } from "@/server/public-api";
import { S } from "@/lib/strings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: S.seo.termsTitle,
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  return <ContentPageView page={await getContentPage("terms-and-conditions")} fallbackTitle={S.seo.termsTitle} />;
}
