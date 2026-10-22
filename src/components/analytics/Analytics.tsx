"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { captureAttribution, readConsent, saveConsent, track } from "@/lib/analytics";
import { S } from "@/lib/strings";

function RouteTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    captureAttribution(window.location.search);
    // Virtual page views for GTM's "Custom Event: page_view" trigger.
    track("page_view", { page_path: pathname, page_location: window.location.href, page_title: document.title });
  }, [pathname, search]);
  return null;
}

function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Read after mount: storage isn't available during server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(readConsent() === null);
  }, []);
  if (!visible) return null;
  const choose = (value: "granted" | "denied") => {
    saveConsent(value);
    setVisible(false);
  };
  return (
    <div role="dialog" aria-label={S.consent.title} className="fixed inset-x-4 bottom-4 z-[90] mx-auto flex max-w-3xl flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-xl">
      <div className="min-w-0 flex-[1_1_320px]">
        <p className="font-semibold">{S.consent.title}</p>
        <p className="text-sm leading-6 text-muted">
          {S.consent.body}{" "}
          <Link href="/privacy" className="text-primary underline">
            {S.consent.policy}
          </Link>
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => choose("granted")}>{S.consent.accept}</Button>
        <Button variant="soft" onClick={() => choose("denied")}>
          {S.consent.reject}
        </Button>
      </div>
    </div>
  );
}

export function Analytics() {
  return (
    <>
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
      <ConsentBanner />
    </>
  );
}
