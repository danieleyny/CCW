import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "../styles/themes.css";
import { brand } from "@/config/brand";
import { BrandStyle } from "@/config/brand-style";
import { Toaster } from "@/components/ui/sonner";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { WebVitals } from "@/components/analytics/web-vitals";

// The marketing and app surfaces share one deliberately small type system.
// next/font self-hosts these files in the deployment, avoiding browser requests
// to Google while preserving a stable first render.
const fontSans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const fontDisplay = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  // The current Bodoni Moda API exposes normal on the variable face. Asking
  // next/font to download a separate italic face can fail during prerender;
  // normal keeps the self-hosted variable font available for all headings.
  style: "normal",
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: true,
});
const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

// Search Console / Bing verification tokens are wired to env so the owner can
// verify ownership WITHOUT a code change: set the var in Vercel and redeploy.
// (DNS/HTML-file verification also works; this is the meta-tag path.)
const verification: Metadata["verification"] = {
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : {}),
  ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
    ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
    : {}),
};

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  metadataBase: new URL(brand.url),
  alternates: {
    types: { "application/rss+xml": [{ url: "/feed.xml", title: `${brand.name} — Guides` }] },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  ...(Object.keys(verification).length ? { verification } : {}),
};

export const viewport: Viewport = { themeColor: "#0A1520" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} h-full antialiased`}
    >
      <head>
        <BrandStyle />
      </head>
      <body className="relative min-h-full flex flex-col">
        {/* V3-P4.5 — keyboard users skip straight to content */}
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-brass px-3 py-2 text-sm font-medium text-brand-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
        >
          Skip to content
        </a>
        {/* Every route group runs the dark register: marketing renders
            <DarkBackdrop /> in MarketingFrame, and the app groups render it
            inside their own `.dark` wrapper. */}
        <div id="main" className="contents">
          {children}
        </div>
        <Toaster richColors closeButton theme="dark" />
        {/* GA4 — only on the real production deployment, so localhost + preview
            traffic never pollutes the analytics. */}
        {process.env.VERCEL_ENV === "production" && (
          <>
            <GoogleAnalytics />
            <WebVitals />
          </>
        )}
      </body>
    </html>
  );
}
