import Link from "next/link"
import { CheckCircle2, Circle, ArrowRight } from "lucide-react"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import type { DataAsk } from "@/lib/concierge/data-asks"

/**
 * "What we need from you" — the data asks the portal requires, as first-class cards on
 * the concierge dashboard (they used to be reachable only by a URL the applicant never
 * saw). Each card shows progress and deep-links to the exact section that collects it.
 */
export function DataAsksSection({ asks }: { asks: DataAsk[] }) {
  return (
    <section className="space-y-3">
      <div>
        <SectionEyebrow>What we need from you</SectionEyebrow>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">Your information</h2>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          The details we enter into the NYPD portal for you. Fill these in and we take it from there.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {asks.map((a) => {
          const done = a.captured >= a.total && a.total > 0
          return (
            <Link
              key={a.key}
              href={a.href}
              className="group flex items-center justify-between gap-3 rounded-lg border border-hairline bg-card p-4 transition-colors hover:border-signal/40"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-ok" />
                ) : (
                  <Circle className="size-4 shrink-0 text-text-low" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium">{a.label}</div>
                  <div className={`text-xs ${done ? "text-ok" : "text-text-mid"}`}>
                    {done ? "Captured" : `${a.captured} of ${a.total} captured`}
                  </div>
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-text-low transition-transform group-hover:translate-x-0.5" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
