"use client";

import { Card } from "@/components/ui/Card";
import { QueryView } from "@/components/ui/States";
import { ContactChannels } from "@/components/marketing/ContactChannels";
import { Endpoints } from "@/lib/api/endpoints";
import { useApiQuery } from "@/lib/api/hooks";
import type { SocialMedia } from "@/lib/api/types";
import { S } from "@/lib/strings";

export default function ContactPage() {
  const query = useApiQuery<SocialMedia>(Endpoints.socialMedia, undefined, { staleTime: 30 * 60_000 });
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{S.more.contact}</h2>
      <p className="text-muted">{S.more.contactWelcome}</p>
      <QueryView query={query}>{(social) => <ContactChannels social={social} />}</QueryView>
    </Card>
  );
}
