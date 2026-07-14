"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Fees } from "@/lib/fees"

/**
 * V5 — the homepage pricing moment: ONE all-in total that expands into a full,
 * honest breakdown. The total is COMPUTED from the DB every render
 * (package + government fees), never written down — change a fee in the admin
 * table and this number moves with it.
 */
function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

export function PricingReveal({
  pkg,
  fees,
}: {
  pkg: { name: string; priceCents: number }
  fees: Fees
}) {
  const [open, setOpen] = useState(false)
  const govCents = fees.applicationCents + fees.fingerprintCents
  const totalCents = pkg.priceCents + govCents

  return (
    <div className="mx-auto max-w-xl">
      <div className="brass-edge glass-premium rounded-2xl p-6 sm:p-8">
        <div className="engraved text-brass-bright">All-in · nothing hidden</div>
        <div className="mt-2 font-display text-4xl font-bold tabular-nums text-prestige sm:text-5xl">
          {usd(totalCents)}
        </div>
        <p className="mt-3 text-sm text-text-mid">
          {usd(pkg.priceCents)} to CARRY. {usd(govCents)} in government fees, paid directly to them —
          never collected by us.
        </p>

        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-6 flex min-h-11 w-full items-center justify-between rounded-lg border border-hairline px-4 text-sm font-medium text-text-mid transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? "Hide the breakdown" : "See the breakdown"}
          <ChevronDown className={cn("size-4 transition-transform duration-300 motion-reduce:transition-none", open && "rotate-180")} />
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-5 pt-5">
              <Group label="Paid to CARRY">
                <Row
                  name="Concierge service"
                  desc="Every document, deadline, and filing packet"
                  amount={usd(pkg.priceCents)}
                />
              </Group>
              <Group label="Paid to the government" muted>
                <Row
                  name="NYPD application fee"
                  desc="Direct to NYPD · never collected by us"
                  amount={fees.applicationFee}
                  muted
                />
                <Row name="DCJS fingerprint fee" desc="Direct to DCJS" amount={fees.fingerprintFee} muted />
              </Group>
              <div className="flex items-center justify-between border-t border-hairline pt-4">
                <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-mid">
                  Total
                </span>
                <span className="font-display text-xl font-bold tabular-nums text-brass-bright">
                  {usd(totalCents)}
                </span>
              </div>
              <p className="rounded-lg bg-signal-dim px-3 py-2 text-[12px] leading-snug text-signal">
                Your 18-hour training course is billed by your instructor and isn&apos;t included above.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link href="/pricing" className="text-sm font-medium text-text-mid hover:text-foreground">
          Other packages →
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
      <div className={cn("shrink-0 font-mono text-sm tabular-nums", muted ? "text-text-mid" : "text-foreground")}>
        {amount}
      </div>
    </div>
  )
}
