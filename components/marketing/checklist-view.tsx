"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, FileText, Mail, Check } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
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

  // Conversion: a personalized checklist was produced (once per page view).
  useEffect(() => {
    trackEvent("checklist_generated")
  }, [])

  return (
    <div className="checklist-experience">
      <section id="checklist-hero" className="checklist-hero">
        <div className="shell checklist-hero-grid">
          <div>
            <p className="eyebrow">Your free NYC checklist</p>
            <h1>Every requirement.<br /><span>One case file.</span></h1>
            <p className="checklist-hero-lede">
              See the standard requirements for your track, tied to the source behind each item.
              No account needed. Your final list is refined during intake.
            </p>

            <div className="track-switch" role="group" aria-label="Your situation">
              {TRACKS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTrack(t.value)}
                  aria-pressed={track === t.value}
                >
                  <i aria-hidden="true" />{t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="checklist-packet" aria-label={`${items.length} requirements apply to this track`}>
            <span className="packet-tab">{track.replace("_", " ")} / active</span>
            <div className="packet-sheet sheet-back" aria-hidden="true" />
            <div className="packet-sheet sheet-middle" aria-hidden="true" />
            <div className="packet-sheet sheet-front">
              <span>CASE REQUIREMENTS</span>
              <strong>{items.length}</strong>
              <p>items mapped to your selected track</p>
              <ol aria-hidden="true"><li /><li /><li /><li /></ol>
            </div>
            <small>Generated from the current public requirements registry</small>
          </div>
        </div>
      </section>

      <section className="shell checklist-layout">
        <aside className="checklist-summary">
          <p className="eyebrow">Case map</p>
          <strong>{items.length}</strong>
          <span>applicable items</span>
          <dl>
            {groups.map((group) => (
              <div key={group.severity}><dt>{group.label}</dt><dd>{group.items.length}</dd></div>
            ))}
          </dl>
          <p className="checklist-summary-note">Your intake may add conditional requirements based on your household and history.</p>
        </aside>

        <div className="checklist-groups">
          {groups.map((g, groupIndex) => (
          <section key={g.severity} className="checklist-group">
            <div className="checklist-group-head">
              <span>0{groupIndex + 1}</span>
              <h2>{g.label}</h2>
              <b>{g.items.length} items</b>
            </div>
            <ul>
              {g.items.map((r) => (
                <li key={r.reqCode} className="checklist-item">
                  <span className="checklist-item-icon"><FileText aria-hidden="true" /></span>
                  <div>
                    <div className="checklist-item-title">
                      <code>{r.reqCode}</code>
                      <strong>{r.title}</strong>
                      {r.blocking && (
                        <span>Required before submission</span>
                      )}
                    </div>
                    {r.authority && (
                      <p>{r.authority}</p>
                    )}
                    {r.sourceUrl && (
                      <a
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Official source <ExternalLink aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          ))}
        </div>
      </section>

      {/* Two CTAs — value first (email), conversion second (run it). */}
      <section id="checklist-cta" className="shell checklist-cta-grid">
        <div className="checklist-email-card">
          <EmailChecklist track={track} />
        </div>
        <div className="checklist-service-card">
          <p className="eyebrow">Ready for an organized case?</p>
          <h3>Have us run the process.</h3>
          <p>
            We track every requirement, keep the work on schedule, and assemble the packet for your
            final review. You remain the applicant and submit your own application.
          </p>
          <div className="checklist-lead-form">
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
      <div className="checklist-email-success">
        <Check aria-hidden="true" /> Sent — check your inbox.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="checklist-email-form">
      <div className="checklist-email-title">
        <Mail aria-hidden="true" />
        <span>Email me this checklist</span>
      </div>
      <p>One field. No phone, no commitment.</p>
      <div className="checklist-email-fields">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <button type="submit" disabled={state === "sending"} className="button">
          {state === "sending" ? "Sending…" : "Email it to me"}
        </button>
      </div>
      {state === "error" && (
        <p className="checklist-email-error">Something went wrong — please try again.</p>
      )}
    </form>
  )
}
