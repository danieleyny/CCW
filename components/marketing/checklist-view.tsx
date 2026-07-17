"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, FileText, Mail, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { LeadForm } from "@/components/marketing/lead-form"
import { StickyCta } from "@/components/marketing/sticky-cta"
import { applicableFor, groupBySeverity, type RegistryItem } from "@/lib/requirements/preview"
import type { IntakeAnswers } from "@/lib/requirements/generate"

type Track = "resident" | "business" | "non_resident"
const TRACKS: { value: Track; label: string }[] = [
  { value: "resident", label: "I live in NYC" },
  { value: "business", label: "I run a business in NYC" },
  { value: "non_resident", label: "Outside NYC (Special Carry)" },
]

const QUIZ_KEY = "carry_eligibility_quiz"

export function ChecklistView({ registry }: { registry: RegistryItem[] }) {
  const [track, setTrack] = useState<Track>("resident")

  // Reuse the eligibility quiz's saved answers to pre-select the track.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUIZ_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { answers?: Record<string, { track?: string }> }
      const t = saved.answers?.location?.track as Track | undefined
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage after hydration
      if (t) setTrack(t)
    } catch {
      /* ignore */
    }
  }, [])

  const jurisdiction = track === "non_resident" ? "special_carry" : "nyc"
  // The public preview is the baseline carry checklist for the track; intake
  // personalizes the conditional items (arrests, cohabitants, veterans…).
  const answers: IntakeAnswers = useMemo(() => ({ isCarry: true }), [])
  const items = useMemo(
    () => applicableFor(registry, jurisdiction, answers),
    [registry, jurisdiction, answers]
  )
  const groups = useMemo(() => groupBySeverity(items), [items])

  return (
    <div className="pb-24 md:pb-0">
      <section id="checklist-hero" className="mx-auto max-w-3xl px-4 pt-14 sm:px-6">
        <SectionEyebrow>Your free NYC checklist</SectionEyebrow>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Every document NYC asks you for.
        </h1>
        <p className="mt-3 text-text-mid">
          Free, personalized to your situation, and no account needed. This is the standard
          checklist — we refine it to your exact case during intake.
        </p>

        {/* Track selector */}
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Your situation">
          {TRACKS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTrack(t.value)}
              aria-pressed={track === t.value}
              className={cn(
                "min-h-11 rounded-lg border px-4 text-sm font-medium transition-colors",
                track === t.value
                  ? "border-brass bg-brass/10 text-brass-bright"
                  : "border-hairline text-text-mid hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-baseline gap-3">
          <span className="font-display text-4xl font-bold tabular-nums text-brass-bright">{items.length}</span>
          <span className="text-text-mid">documents apply to you</span>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-3xl px-4 sm:px-6">
        {groups.map((g) => (
          <div key={g.severity} className="mb-8">
            <h2 className="sticky top-16 z-10 -mx-4 bg-background/90 px-4 py-2 engraved text-brass-bright backdrop-blur sm:top-16">
              {g.label} · {g.items.length}
            </h2>
            <ul className="mt-2 space-y-2">
              {g.items.map((r) => (
                <li key={r.reqCode} className="flex items-start gap-3 rounded-lg border border-hairline bg-card p-4">
                  <FileText className="mt-0.5 size-4 shrink-0 text-brass" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-mid">
                        {r.reqCode}
                      </span>
                      <span className="text-sm font-medium">{r.title}</span>
                      {r.blocking && (
                        <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] uppercase text-danger">
                          Required to file
                        </span>
                      )}
                    </div>
                    {r.authority && (
                      <div className="mt-1 font-mono text-[11px] text-text-low">{r.authority}</div>
                    )}
                    {r.sourceUrl && (
                      <a
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-signal hover:underline"
                      >
                        Official source <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Two CTAs — value first (email), conversion second (run it). */}
      <section id="checklist-cta" className="mx-auto mt-4 max-w-3xl px-4 sm:px-6">
        <div className="rounded-xl border border-hairline bg-surface-1/40 p-6">
          <EmailChecklist track={track} />
        </div>
        <div className="mt-4 rounded-xl border border-hairline brass-edge bg-card p-6">
          <SectionEyebrow>Ready to hand it off?</SectionEyebrow>
          <h3 className="mt-2 font-display text-xl font-semibold">Have us run it</h3>
          <p className="mt-1 text-sm text-text-mid">
            We collect every document, keep it on schedule, and assemble your filing packet. You review
            and submit your own application.
          </p>
          <div className="mt-4">
            <LeadForm
              source="checklist"
              showBorough={false}
              showMessage={false}
              submitLabel="Have us run it"
              successTitle="On it."
              successBody="Your Gun License NYC concierge will reach out within one business day."
              accountCta
              hidden={{ track }}
            />
          </div>
        </div>
      </section>

      <StickyCta
        watchOutId="checklist-hero"
        hideNearId="checklist-cta"
        href="#checklist-cta"
        label="Have us run it"
      />
    </div>
  )
}

function EmailChecklist({ track }: { track: Track }) {
  const [email, setEmail] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState("sending")
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, offer: "checklist", from: "carry:checklist", jurisdiction: "ny", payload: { track } }),
      })
      const j = await res.json()
      setState(j.ok ? "done" : "error")
    } catch {
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-ok">
        <Check className="size-4" /> Sent — check your inbox.
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <div className="flex items-center gap-2 text-brass-bright">
        <Mail className="size-4" />
        <span className="engraved">Email me this checklist</span>
      </div>
      <p className="mt-1 text-sm text-text-mid">One field. No phone, no commitment.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-h-11 flex-1 rounded-lg border border-hairline bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={state === "sending"} className="min-h-11">
          {state === "sending" ? "Sending…" : "Email it to me"}
        </Button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-sm text-danger">Something went wrong — please try again.</p>
      )}
    </form>
  )
}
