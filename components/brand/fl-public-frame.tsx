import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";
import { BRANDS } from "@/config/brands";

/** Minimal application frame for the FL eligibility/auth handoff surface. */
export function FlPublicFrame({ children }: { children: React.ReactNode }) {
  const brand = BRANDS.fl;

  return (
    <div className="mkt2 flex min-h-svh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <BrandLogo href={brand.marketingOrigin} motion="none" />
          <Link
            href="/auth/login"
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold hover:bg-black/[.04]"
          >
            Sign in
          </Link>
        </div>
      </header>
      <main id="top" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-black/10 bg-white px-5 py-8 text-sm text-[var(--text-mid)] sm:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-5 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <BrandLogo href={brand.marketingOrigin} size="sm" motion="none" />
            <p className="mt-3 max-w-3xl text-xs leading-relaxed">{brand.disclaimer}</p>
          </div>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <a href={brand.legalLinks.privacy}>Privacy</a>
            <a href={brand.legalLinks.terms}>Terms</a>
            <a href={brand.legalLinks.refunds}>Refunds</a>
            <a href={brand.legalLinks.disclaimer}>Disclaimer</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
