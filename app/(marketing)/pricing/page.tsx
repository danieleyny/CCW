import Link from "next/link"
import { Check } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getActivePackages } from "@/lib/packages"
import { getFees } from "@/lib/fees"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"

export const metadata = {
  title: "Pricing",
  description:
    "CARRY membership tiers for NYC concealed carry assistance — Self-Guided, Full Concierge, Non-Resident / Special Carry, and Renewal.",
}

const FEATURES: Record<string, string[]> = {
  self_guided: ["Client portal access", "Full document checklist", "Filing guidance", "Email support"],
  full_concierge: [
    "Everything in Self-Guided",
    "Training coordination",
    "Document prep + notarization help",
    "Application assembly + filing",
    "Interview preparation",
    "Priority concierge support",
  ],
  non_resident: ["Dedicated Special Carry track", "Out-of-area logistics", "Document prep + filing"],
  renewal: ["Discounted 3-year renewal", "Document refresh", "Re-filing support"],
}

export default async function Pricing() {
  // V3-P3.1 — pricing comes from the DB; a price change is a data edit.
  const supabase = await createClient()
  const packages = await getActivePackages(supabase)
  const fees = await getFees(supabase)
  return (
    <>
      <PageHero
        eyebrow="Membership"
        title="Choose your level of service"
        subtitle="Deposit to start, balance on filing. Every tier is built around getting you through a deliberately demanding process without mistakes."
      />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-4">
          {packages.map((p) => {
            const featured = p.featured
            return (
              <div
                key={p.key}
                className={`flex flex-col rounded-lg border bg-card p-6 ${
                  featured ? "brass-edge" : "border-hairline edge-highlight"
                }`}
              >
                {featured && <div className="engraved mb-2 text-brass">Most chosen</div>}
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                <div className="mt-2 font-display text-3xl font-bold tabular-nums">{p.priceLabel}</div>
                <p className="mt-2 text-sm text-text-mid">{p.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {(FEATURES[p.key] ?? []).map((f) => (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-brass" />
                      <span className="text-text-mid">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant={featured ? "default" : "outline"} className="mt-6 w-full">
                  <Link href={`/portal/enroll?package=${p.key}`}>
                    {p.priceCents > 0 ? "Buy now" : "Talk to us"}
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center font-mono text-xs text-text-low">
          Service fees only. NYPD charges a separate {fees.applicationFee} license fee + {fees.fingerprintFee} fingerprinting fee.
        </p>
      </section>
    </>
  )
}
