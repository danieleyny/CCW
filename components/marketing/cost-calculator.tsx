"use client"

import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Fees } from "@/lib/fees"
import type { ServicePackage } from "@/lib/packages"
import type { ExternalCostEstimates } from "@/config/brand"
import { Button } from "@/components/ui/button"

/**
 * The interactive NYC gun-license cost calculator — the tool the category is
 * missing. It does NOT introduce a single new number: the service tiers come
 * from the DB (service_packages), the two government fees from the `fees` table,
 * and the training/notary RANGES from config's externalCostEstimates (the same
 * sourced ranges the homepage CostCard uses). It only lets a visitor pick the
 * two things that actually vary for them — which service tier, and whether they
 * still need the 18-hour course — and recomputes an honest all-in estimate,
 * always keeping the "only our fee is paid to us" split visible.
 */
function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}
function usdRange(low: number, high: number): string {
  return low === high ? usd(low) : `${usd(low)} – ${usd(high)}`
}
const round50 = (cents: number) => Math.round(cents / 5000) * 5000

const SELF_FILE = "__self__"

export function CostCalculator({
  packages,
  fees,
  estimates,
}: {
  packages: ServicePackage[]
  fees: Fees
  estimates: ExternalCostEstimates
}) {
  // Default to the featured/concierge tier if there is one, else self-file.
  const featured = packages.find((p) => p.featured) ?? packages.find((p) => p.priceCents > 0)
  const [tierKey, setTierKey] = useState<string>(featured?.key ?? SELF_FILE)
  const [needTraining, setNeedTraining] = useState(true)

  const tier = packages.find((p) => p.key === tierKey)
  const serviceCents = tier?.priceCents ?? 0
  const govCents = fees.applicationCents + fees.fingerprintCents
  const trainLow = needTraining ? estimates.training.lowCents : 0
  const trainHigh = needTraining ? estimates.training.highCents : 0

  const low = serviceCents + trainLow + govCents + estimates.notary.lowCents
  const high = serviceCents + trainHigh + govCents + estimates.notary.highCents

  const rows: { label: string; sub: string; amount: string; ours?: boolean; muted?: boolean }[] = [
    ...(serviceCents > 0
      ? [{ label: tier!.name, sub: "Our concierge fee — the only part paid to us", amount: usd(serviceCents), ours: true }]
      : [{ label: "Self-file (no service)", sub: "You handle the process yourself", amount: usd(0), muted: true }]),
    ...(needTraining
      ? [{ label: estimates.training.label, sub: estimates.training.note, amount: usdRange(estimates.training.lowCents, estimates.training.highCents), muted: true }]
      : []),
    { label: "NYPD application fee", sub: "Paid to the NYPD · non-refundable", amount: fees.applicationFee, muted: true },
    { label: "Fingerprinting", sub: "Paid to New York State", amount: fees.fingerprintFee, muted: true },
    { label: estimates.notary.label, sub: estimates.notary.note, amount: usdRange(estimates.notary.lowCents, estimates.notary.highCents), muted: true },
  ]

  return (
    <div className="brass-edge glass-premium mx-auto max-w-3xl rounded-2xl p-6 sm:p-8">
      <div className="engraved text-brass-bright">Estimate your all-in cost</div>
      <p className="mt-2 text-sm text-text-mid">
        Adjust the two things that actually change your total. Government fees, training, and
        notarization are paid directly to those providers — we never mark up anything but our own fee.
      </p>

      {/* ── Control 1 · service tier ─────────────────────────────────────── */}
      <fieldset className="mt-6">
        <legend className="engraved mb-3 text-text-low">How much do you want handled?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {packages.map((p) => (
            <TierButton
              key={p.key}
              selected={tierKey === p.key}
              onClick={() => setTierKey(p.key)}
              name={p.name}
              price={p.priceLabel}
            />
          ))}
          <TierButton
            selected={tierKey === SELF_FILE}
            onClick={() => setTierKey(SELF_FILE)}
            name="Just the government path"
            price="No service"
          />
        </div>
      </fieldset>

      {/* ── Control 2 · training ─────────────────────────────────────────── */}
      <fieldset className="mt-5">
        <legend className="engraved mb-3 text-text-low">The 18-hour course</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <TierButton selected={needTraining} onClick={() => setNeedTraining(true)} name="I still need it" price="Add training" />
          <TierButton selected={!needTraining} onClick={() => setNeedTraining(false)} name="Already completed it" price="Skip training" />
        </div>
      </fieldset>

      {/* ── Live result ──────────────────────────────────────────────────── */}
      <div className="mt-7 rounded-xl border border-hairline bg-card p-5" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-mid">
            Estimated all-in
          </span>
          <span className="font-display text-2xl font-bold tabular-nums text-brass-bright sm:text-3xl">
            {usdRange(round50(low), round50(high))}
          </span>
        </div>

        <ul className="mt-4 divide-y divide-hairline">
          {rows.map((r) => (
            <li key={r.label} className="flex items-baseline justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className={cn("block text-sm font-medium", r.ours ? "text-brass-bright" : "text-text-hi")}>
                  {r.label}
                </span>
                <span className="block text-[12px] text-text-low">{r.sub}</span>
              </span>
              <span className={cn("shrink-0 font-mono text-sm tabular-nums", r.muted ? "text-text-mid" : "text-foreground")}>
                {r.amount}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-lg bg-signal-dim px-3 py-2 text-[12px] leading-snug text-signal">
          {estimates.sourceNote}
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/eligibility">Check your eligibility</Link>
        </Button>
        <Link href="/pricing" className="text-sm font-medium text-text-mid hover:text-foreground">
          Compare all packages →
        </Link>
      </div>
    </div>
  )
}

function TierButton({
  selected,
  onClick,
  name,
  price,
}: {
  selected: boolean
  onClick: () => void
  name: string
  price: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-brass bg-brass/10 text-foreground"
          : "border-hairline text-text-mid hover:border-hairline-strong hover:text-foreground"
      )}
    >
      <span className="min-w-0 text-sm font-medium">{name}</span>
      <span className={cn("shrink-0 font-mono text-[12px] tabular-nums", selected ? "text-brass-bright" : "text-text-low")}>
        {price}
      </span>
    </button>
  )
}
