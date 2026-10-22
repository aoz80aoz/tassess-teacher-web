"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";
import { site } from "@/lib/site";
import { S } from "@/lib/strings";

// On a phone, offers the store app (AppsFlyer OneLink can replace the
// store URLs in NEXT_PUBLIC_*_STORE_URL to attribute installs).

const KEY = "tt_banner_dismissed";

export function SmartBanner() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {}
    const ua = navigator.userAgent;
    const store = /iPhone|iPad|iPod/.test(ua) ? site.appStoreUrl : /Android/.test(ua) ? site.playStoreUrl : "";
    // Platform is only known in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (store) setUrl(store);
  }, []);
  if (!url) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setUrl(null);
  };
  return (
    <div className="flex items-center gap-3 border-b border-line bg-primary-soft px-4 py-2.5 md:hidden">
      <button type="button" onClick={dismiss} aria-label={S.smartBanner.dismiss} className="grid size-9 place-items-center text-muted">
        <Icon name="close" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{S.smartBanner.title}</p>
        <p className="text-xs text-muted">{S.smartBanner.body}</p>
      </div>
      <a href={url} onClick={() => track("cta_click", { location: "smart_banner" })} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
        {S.smartBanner.open}
      </a>
    </div>
  );
}
