import type { SocialMedia } from "@/lib/api/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { S } from "@/lib/strings";

export function ContactChannels({ social }: { social: SocialMedia | null }) {
  const channels: { icon: IconName; label: string; value: string; href: string }[] = [];
  if (social?.email) channels.push({ icon: "mail", label: S.more.email, value: social.email, href: `mailto:${social.email}` });
  if (social?.whatsapp) channels.push({ icon: "whatsapp", label: S.more.whatsapp, value: social.whatsapp, href: `https://wa.me/${social.whatsapp.replace(/\D/g, "")}` });
  const links = (["facebook", "twitter", "instagram", "snapchat", "tiktok", "youtube", "linkedIn", "pinterest", "telegram"] as const).filter((k) => social?.[k]);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
        {channels.map((c) => (
          <a key={c.label} href={c.href} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 hover:border-primary" rel="noopener">
            <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icon name={c.icon} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{c.label}</span>
              <span className="block truncate text-sm text-muted" dir="ltr">
                {c.value}
              </span>
            </span>
          </a>
        ))}
      </div>
      {links.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-semibold">{S.more.social}</span>
          <div className="flex flex-wrap gap-2">
            {links.map((k) => (
              <a key={k} href={social![k]!} className="rounded-xl border border-line bg-white px-4 py-2 text-sm hover:border-primary" rel="noopener" dir="ltr">
                {k}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
