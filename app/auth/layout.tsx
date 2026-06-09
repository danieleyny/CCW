import Link from "next/link"
import { brand } from "@/config/brand"
import { TechGrid } from "@/components/shared/tech-grid"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <TechGrid glow="both" />
      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-display text-2xl font-semibold tracking-tight text-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-brass text-base font-bold text-brand-foreground">
            {brand.logo.mark}
          </span>
          {brand.logo.wordmark}
        </Link>
        {children}
      </div>
    </div>
  )
}
