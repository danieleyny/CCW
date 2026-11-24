import BrandLogo from "@/components/brand/BrandLogo"
import { TechGrid } from "@/components/shared/tech-grid"
import { getRequestBrand } from "@/lib/brand/server"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const requestBrand = await getRequestBrand()
  // Top-aligned on a phone so the card doesn't jump when the keyboard opens;
  // centered from sm:+.
  return (
    <div className="dark relative flex min-h-svh flex-col items-center justify-start bg-background px-4 pb-12 pt-8 text-foreground sm:justify-center sm:py-12">
      <TechGrid glow="both" />
      <div className="relative w-full max-w-sm">
        <BrandLogo tone="light" size="sm" className="mb-6 justify-center sm:mb-8" />
        {children}
        <div className="mt-6 text-center text-[11px] leading-relaxed text-text-low">
          <p>{requestBrand.disclaimer}</p>
          <p className="mt-3 flex justify-center gap-3">
            <a href={requestBrand.legalLinks.privacy} className="underline hover:text-text-mid">Privacy</a>
            <a href={requestBrand.legalLinks.terms} className="underline hover:text-text-mid">Terms</a>
          </p>
        </div>
      </div>
    </div>
  )
}
