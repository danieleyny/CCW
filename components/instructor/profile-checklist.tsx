"use client"

import { Check, Circle, ArrowDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

/** Which form field each go-live check corresponds to (scroll/flash target). */
const ANCHOR: Record<string, string> = {
  bio: "field-bio",
  price: "field-price",
  classroom: "field-classroom",
  range: "field-range",
  format: "field-format",
  languages: "field-languages",
}

type CheckItem = { key: string; label: string; why: string; done: boolean }

/**
 * The go-live checklist, now interactive: clicking an unfinished item scrolls
 * the matching form field into view and flashes a ring around it, so a trainer
 * never has to hunt for where to fix what's missing. Client component because it
 * drives scroll + a one-shot highlight (see `.field-flash` in globals.css).
 */
export function ProfileChecklist({
  live,
  verified,
  percent,
  checks,
}: {
  live: boolean
  verified: boolean
  percent: number
  checks: CheckItem[]
}) {
  function jumpTo(key: string) {
    const anchor = ANCHOR[key]
    if (!anchor) return
    const el = document.getElementById(anchor)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    // Restart the flash even if it's mid-animation from a previous click.
    el.classList.remove("field-flash")
    void el.offsetWidth // force reflow so the animation re-triggers
    el.classList.add("field-flash")
    window.setTimeout(() => el.classList.remove("field-flash"), 1900)
  }

  return (
    <Card className={live ? "border-ok/30" : "border-brass/30"}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {live ? "You're live — applicants can find you" : "Complete these to start getting matched"}
            </h2>
            <p className="mt-1 text-xs text-text-mid">
              {verified
                ? "Your DCJS credential is verified."
                : "An admin still needs to verify your DCJS credential — we'll check it before you go live."}
            </p>
          </div>
          <span className="font-mono text-sm tabular-nums text-text-mid">{percent}%</span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className={live ? "h-full rounded-full bg-ok" : "h-full rounded-full bg-brass"}
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="space-y-1">
          {checks.map((c) =>
            c.done ? (
              <li key={c.key} className="flex items-start gap-2 py-1 text-xs">
                <Check className="mt-0.5 size-3.5 shrink-0 text-ok" />
                <span className="text-text-low line-through">{c.label}</span>
              </li>
            ) : (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => jumpTo(c.key)}
                  className="group flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left text-xs transition-colors hover:bg-surface-2"
                >
                  <Circle className="mt-0.5 size-3.5 shrink-0 text-text-low" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-foreground group-hover:text-signal">{c.label}</span>
                    <span className="block text-text-mid">{c.why}</span>
                  </span>
                  <ArrowDown className="mt-0.5 size-3.5 shrink-0 text-text-low opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </li>
            )
          )}
        </ul>

        {!live && (
          <p className="text-xs text-text-low">
            Tap anything above to jump to it. Until this is complete you won&apos;t appear in an
            applicant&apos;s feed or be able to send offers — including auto-offers.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
