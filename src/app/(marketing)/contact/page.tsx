import type { Metadata } from "next";
import { ContactChannels } from "@/components/marketing/ContactChannels";
import { getSocialMedia } from "@/server/public-api";
import { S } from "@/lib/strings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: S.seo.contactTitle,
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-bold">{S.seo.contactTitle}</h1>
      <p className="text-muted">{S.more.contactWelcome}</p>
      <ContactChannels social={await getSocialMedia()} />
    </div>
  );
}
