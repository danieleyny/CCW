import Link from "next/link"
import { ArrowUpRight, ShieldCheck } from "lucide-react"
import { BRANDS, type BrandKey } from "@/config/brands"

export function OtherBrandGate({ caseBrand }: { caseBrand: BrandKey }) {
  const destination = BRANDS[caseBrand]
  return (
    <main className="dark flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-lg rounded-2xl border border-hairline bg-card p-7 text-center shadow-2xl sm:p-10">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-signal-dim text-signal">
          <ShieldCheck aria-hidden className="size-6" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-text-low">Account location</p>
        <h1 className="mt-2 font-display text-3xl">Your application is with {destination.displayName}</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-mid">
          We have not moved or duplicated your information. Continue on the correct secure site to see your application.
        </p>
        <Link
          href={`${destination.appOrigin}/portal`}
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-primary-foreground"
        >
          Continue to {destination.displayName}
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      </section>
    </main>
  )
}
