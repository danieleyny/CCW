import Link from "next/link"
import { brand } from "@/config/brand"
import { LogoMark } from "@/components/brand/logo"
import { TechGrid } from "@/components/shared/tech-grid"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark relative flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <TechGrid glow="both" />
      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-display text-2xl font-semibold tracking-tight text-foreground"
        >
          <LogoMark className="size-9 text-brass" />
          {brand.logo.wordmark}
        </Link>
        {children}
      </div>
    </div>
  )
}
