import Link from "next/link"
import { brand } from "@/config/brand"
import { LogoMark } from "@/components/brand/logo"
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
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:mb-8"
        >
          <LogoMark className="size-9 text-brass" />
          {brand.logo.wordmark}
        </Link>
        {children}
      </div>
    </div>
  )
}
