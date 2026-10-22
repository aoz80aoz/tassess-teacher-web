// Marketing events, pushed to GTM's dataLayer. GTM forwards them to GA4,
// Meta, Snapchat, TikTok and Google Ads, so the site code never names a
// specific pixel. Event names follow GA4's recommended events.

type EventName =
  | "page_view"
  | "sign_up"
  | "login"
  | "generate_lead"
  | "view_item_list"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase"
  | "cta_click";

type Params = Record<string, string | number | boolean | undefined | object>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const UTM_KEY = "tt_utm";
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "ttclid", "sccid"];

export function track(event: EventName, params: Params = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...readAttribution(), ...params });
}

/** Keeps the first-touch campaign of this visit for later conversions. */
export function captureAttribution(search: string) {
  try {
    const params = new URLSearchParams(search);
    const found: Record<string, string> = {};
    for (const key of UTM_FIELDS) {
      const value = params.get(key);
      if (value) found[key] = value;
    }
    if (Object.keys(found).length > 0 && !localStorage.getItem(UTM_KEY)) {
      localStorage.setItem(UTM_KEY, JSON.stringify({ ...found, landing_page: window.location.pathname }));
    }
  } catch {
    // Storage blocked: attribution is best-effort.
  }
}

export function readAttribution(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(UTM_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

const CONSENT_KEY = "tt_consent";
export type Consent = "granted" | "denied";

export function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

/** Google Consent Mode v2: ad/analytics storage follow the visitor's choice. */
export function saveConsent(consent: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {}
  applyConsent(consent);
  window.dataLayer?.push({ event: "consent_update", consent_state: consent });
}

/** Same call shape as gtag('consent', 'update', …), which GTM reads. */
export function applyConsent(consent: Consent) {
  window.dataLayer = window.dataLayer ?? [];
  // gtag pushes the `arguments` object, not an array.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments as unknown as Record<string, unknown>);
  })("consent", "update", {
    ad_storage: consent,
    analytics_storage: consent,
    ad_user_data: consent,
    ad_personalization: consent,
  });
}

/** Inline script run before GTM: everything denied until the visitor chooses. */
export const CONSENT_DEFAULT_SCRIPT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});try{if(localStorage.getItem('${CONSENT_KEY}')==='granted'){gtag('consent','update',{ad_storage:'granted',analytics_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});}}catch(e){}`;
