"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Fees } from "@/lib/fees"
import type { ExternalCostEstimates } from "@/config/brand"

/**
 * V6 — the homepage cost moment. One prestige number (the concierge fee, the
 * ONLY money we collect) that expands into an honest, grouped breakdown and an
 * ESTIMATED ALL-IN RANGE. Everything is COMPUTED per render from props —
 * concierge price + government fees from the DB, training/notary as documented
 * ranges from `externalCostEstimates` — so a fee edit moves every number here.
 * Nothing is hardcoded. Ranges exist because third-party providers set their own
 * prices; we never collect or mark up anything but our own fee.
 */
function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

/** "$350 – $425", collapsing to a single value when low === high. */
function usdRange(lowCents: number, highCents: number): string {
  return lowCents === highCents ? usd(lowCents) : `${usd(lowCents)} – ${usd(highCents)}`
}

const roundTo50 = (cents: number) => Math.round(cents / 5000) * 5000

export function CostCard({
  concierge,
  fees,
  estimates,
}: {
  concierge: { name: string; priceCents: number }
  fees: Fees
  estimates: ExternalCostEstimates
}) {
  const [open, setOpen] = useState(false)

  const govCents = fees.applicationCents + fees.fingerprintCents
  const allInLow =
    concierge.priceCents + estimates.training.lowCents + govCents + estimates.notary.lowCents
  const allInHigh =
    concierge.priceCents + estimates.training.highCents + govCents + estimates.notary.highCents

  return (
    <div className="mx-auto max-w-xl">
      <div className="brass-edge glass-premium rounded-2xl p-6 sm:p-8">
        <div className="engraved text-brass-bright">Paid to us · the only fee we collect</div>
        <div className="mt-2 font-display text-4xl font-bold tabular-nums text-prestige sm:text-5xl">
          {usd(concierge.priceCents)}
        </div>
        <p className="mt-3 text-sm text-text-mid">
          Training, government fees, and notarization are paid directly to those providers — never
          collected by us, and never marked up.
        </p>

        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-6 flex min-h-11 w-full items-center justify-between rounded-lg border border-hairline px-4 text-sm font-medium text-text-mid transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? "Hide the full picture" : "See the full picture"}
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-300 motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-5 pt-5">
              <Group label="Paid to us">
                <Row
                  name={concierge.name}
                  desc="Every document, deadline, and filing packet — start to interview"
                  amount={usd(concierge.priceCents)}
                />
              </Group>

              <Group label="Paid directly to others" muted>
                <Row
                  name={estimates.training.label}
                  desc={estimates.training.note}
                  amount={usdRange(estimates.training.lowCents, estimates.training.highCents)}
                  muted
                />
                <Row
                  name="NYPD application fee"
                  desc="Direct to NYPD · never collected by us"
                  amount={fees.applicationFee}
                  muted
                />
                <Row name="DCJS fingerprint fee" desc="Direct to DCJS" amount={fees.fingerprintFee} muted />
                <Row
                  name={estimates.notary.label}
                  desc={estimates.notary.note}
                  amount={usdRange(estimates.notary.lowCents, estimates.notary.highCents)}
                  muted
                />
              </Group>

              <div className="flex items-baseline justify-between border-t border-hairline pt-4">
                <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-mid">
                  Estimated all-in
                </span>
                <span className="font-display text-xl font-bold tabular-nums text-brass-bright">
                  {usdRange(roundTo50(allInLow), roundTo50(allInHigh))}
                </span>
              </div>

              <p className="rounded-lg bg-signal-dim px-3 py-2 text-[12px] leading-snug text-signal">
                {estimates.sourceNote}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link href="/pricing" className="text-sm font-medium text-text-mid hover:text-foreground">
          Compare all packages →
        </Link>
      </div>
    </div>
  )
}

function Group({
  label,
  muted,
  children,
}: {
  label: string
  muted?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className={cn("engraved mb-2", muted ? "text-text-low" : "text-brass-bright")}>{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({
  name,
  desc,
  amount,
  muted,
}: {
  name: string
  desc: string
  amount: string
  muted?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <div className={cn("text-sm font-medium", muted && "text-text-mid")}>{name}</div>
        <div className="text-[12px] text-text-low">{desc}</div>
      </div>
      <div
        className={cn(
          "shrink-0 font-mono text-sm tabular-nums",
          muted ? "text-text-mid" : "text-foreground"
        )}
      >
        {amount}
      </div>
    </div>
  )
}
