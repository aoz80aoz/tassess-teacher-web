import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import { Analytics } from "@/components/analytics/Analytics";
import { Providers } from "@/components/Providers";
import { CONSENT_DEFAULT_SCRIPT } from "@/lib/analytics";
import { site } from "@/lib/site";
import { S } from "@/lib/strings";
import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({
  variable: "--font-plex",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: S.seo.defaultTitle, template: S.seo.titleTemplate },
  description: S.seo.description,
  keywords: [...S.seo.keywords],
  applicationName: S.appName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: S.appName,
    title: S.seo.defaultTitle,
    description: S.seo.description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: S.seo.defaultTitle, description: S.seo.description },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${plex.variable} h-full antialiased`}>
      <head>
        {/* Consent Mode default (denied) must run before GTM loads. */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SCRIPT }} />
      </head>
      {site.gtmId && <GoogleTagManager gtmId={site.gtmId} />}
      <body className="min-h-full font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
          {S.common.skipToContent}
        </a>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
