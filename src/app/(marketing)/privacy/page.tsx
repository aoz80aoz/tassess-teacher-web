import type { Metadata } from "next";
import { ContentPageView } from "@/components/marketing/ContentPageView";
import { getContentPage } from "@/server/public-api";
import { S } from "@/lib/strings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: S.seo.privacyTitle,
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  return <ContentPageView page={await getContentPage("privacy-policy")} fallbackTitle={S.seo.privacyTitle} />;
}
