import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { site } from "@/lib/site";
import { S } from "@/lib/strings";
import { getFrontSocialMedia } from "@/server/public-api";

// The contact links come from the API (GET /front/social_media).
const SOCIAL = ["whatsapp", "facebook", "twitter", "instagram", "snapchat", "tiktok", "youtube", "linkedIn", "pinterest", "telegram"] as const;
const SOCIAL_LABEL: Record<(typeof SOCIAL)[number], string> = {
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  twitter: "X",
  instagram: "Instagram",
  snapchat: "Snapchat",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedIn: "LinkedIn",
  pinterest: "Pinterest",
  telegram: "Telegram",
};

export async function MarketingFooter() {
  const social = await getFrontSocialMedia();
  const links = SOCIAL.flatMap((k) => {
    const value = social?.[k];
    if (!value) return [];
    return [{ key: k, href: k === "whatsapp" ? `https://wa.me/${value.replace(/\D/g, "")}` : value }];
  });

  return (
    <footer className="bg-ink text-line-2">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 text-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Logo onDark />
          <nav aria-label={S.marketing.footerNav} className="flex flex-wrap gap-6">
            <Link href="/about" className="hover:text-white">
              {S.marketing.footerAbout}
            </Link>
            <Link href="/terms" className="hover:text-white">
              {S.marketing.footerTerms}
            </Link>
            <Link href="/privacy" className="hover:text-white">
              {S.marketing.footerPrivacy}
            </Link>
            <Link href="/contact" className="hover:text-white">
              {S.marketing.footerContact}
            </Link>
          </nav>
        </div>
        {(links.length > 0 || social?.email) && (
          <div className="flex flex-wrap items-center gap-3" aria-label={S.marketing.contactTitle}>
            {social?.email && (
              <a href={`mailto:${social.email}`} className="rounded-lg border border-white/20 px-3 py-2 hover:text-white" dir="ltr">
                {social.email}
              </a>
            )}
            {links.map((l) => (
              <a key={l.key} href={l.href} target="_blank" rel="noopener" className="rounded-lg border border-white/20 px-3 py-2 hover:text-white" dir="ltr">
                {SOCIAL_LABEL[l.key]}
              </a>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
          <span>{S.marketing.copyright(new Date().getFullYear())}</span>
          <div className="flex flex-wrap gap-3">
            {site.appStoreUrl && (
              <a href={site.appStoreUrl} className="rounded-lg border border-white/20 px-3 py-2 hover:text-white" rel="noopener">
                {S.marketing.appStore}
              </a>
            )}
            {site.playStoreUrl && (
              <a href={site.playStoreUrl} className="rounded-lg border border-white/20 px-3 py-2 hover:text-white" rel="noopener">
                {S.marketing.googlePlay}
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
