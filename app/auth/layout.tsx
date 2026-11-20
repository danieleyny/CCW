import BrandLogo from "@/components/brand/BrandLogo"
import { TechGrid } from "@/components/shared/tech-grid"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Top-aligned on a phone so the card doesn't jump when the keyboard opens;
  // centered from sm:+.
  return (
    <div className="dark relative flex min-h-svh flex-col items-center justify-start bg-background px-4 pb-12 pt-8 text-foreground sm:justify-center sm:py-12">
      <TechGrid glow="both" />
      <div className="relative w-full max-w-sm">
        <BrandLogo tone="light" size="sm" className="mb-6 justify-center sm:mb-8" />
        {children}
      </div>
    </div>
  )
}
