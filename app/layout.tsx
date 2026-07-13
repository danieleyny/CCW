import type { Metadata } from "next";
import { Geist, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { brand } from "@/config/brand";
import { BrandStyle } from "@/config/brand-style";
import { Toaster } from "@/components/ui/sonner";

const fontSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontDisplay = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  metadataBase: new URL(brand.url),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} h-full antialiased`}
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
        {/* Global obsidian backdrop: faint blueprint grid + brass/cyan rim glows */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 tech-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
          <div className="absolute -top-48 left-1/2 h-96 w-[64rem] -translate-x-1/2 rounded-full bg-brass/5 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-80 w-96 rounded-full bg-signal/5 blur-[140px]" />
          <div className="absolute bottom-1/3 -left-32 h-80 w-80 rounded-full bg-ice/[0.04] blur-[150px]" />
        </div>
        <div id="main" className="contents">
          {children}
        </div>
        <Toaster richColors closeButton theme="dark" />
      </body>
    </html>
  );
}
