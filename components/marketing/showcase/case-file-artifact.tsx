import { Check, CircleDashed, Target } from "lucide-react"
import { CASE_STAGES, stageMeta, stageProgress, type CaseStageKey } from "@/config/stages"

/**
 * V9 — the layered case-file artifact for the homepage "You'll never wonder
 * what's next" section. A SERVER component on purpose: every string here is real
 * content in the HTML (crawlers read it), and nothing in it is interactive.
 *
 * A11y contract (easy to get wrong): this is an ILLUSTRATION of the product, not
 * the product. "Confirm this slot" and every control-looking element is a <span>,
 * never a <button> — a keyboard user must not tab into a control that does
 * nothing. The whole thing is a <figure> with an sr-only <figcaption>; all text
 * stays real text (no role="img" + aria-label, which would hide it from AT).
 * Decorative layers carry aria-hidden.
 */

/** The one next action — the visual hero. Sourced from the training-decay rule
 *  the reminders engine already enforces (lib/reminders/engine.ts): a course
 *  certificate must be under six months old on the filing date. `Sep 3` is
 *  illustrative sample data inside a mock. */
const NEXT_MOVE = {
  flag: "Your next move",
  when: "This week",
  title: "Refresh your safety certificate",
  body: "Your 18-hour course certificate ages out Sep 3 — it has to be under six months old on the day you file.",
  handled: "We already found a refresher near you — Saturday 9:00 AM, Queens.",
  action: "Confirm this slot",
  effort: "Takes about 2 minutes",
} as const

const HANDLED = [
  { plain: "Character references — notarized", meta: "4 / 4", status: "satisfied" },
  { plain: "A statement from everyone you live with", meta: "3 / 3", status: "satisfied" },
  { plain: "Interview packet — assembling", meta: "on us", status: "in_progress" },
] as const

export function CaseFileArtifact() {
  const STAGE: CaseStageKey = "document_collection"
  const meta = stageMeta(STAGE)
  const order = meta.order // 6
  const total = CASE_STAGES.length // 13
  const pct = stageProgress(STAGE) // 46
  const stageNo = String(order).padStart(2, "0")

  return (
    <figure className="cfa relative">
      <div aria-hidden className="cfa-glow" />

      {/* Ghost panel — "there's a whole ledger behind this." Pure decoration. */}
      <div aria-hidden className="cfa-ghost">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-brass" />
          <span className="h-2 w-20 rounded-full bg-white/15" />
        </div>
        {Array.from({ length: 13 }).map((_, i) => (
          <div key={i} className={`cfa-ghost-row ${i === 0 ? "is-brass" : ""}`} />
        ))}
      </div>

      <div className="cfa-main panel-instrument relative z-10 overflow-hidden rounded-2xl">
        {/* Bezel */}
        <header className="flex items-center justify-between gap-3 border-b border-hairline bg-white/[0.015] px-5 py-3">
          <div className="flex items-center gap-2">
            <Target aria-hidden className="size-3.5 text-brass" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-mid">
              Case file · NYC carry
            </span>
          </div>
          <span className="rounded-full border border-hairline-strong bg-surface-2 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-mid">
            Mid-journey
          </span>
        </header>

        <div className="p-5">
          {/* Stage readout */}
          <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.12em]">
            <span className="text-text-hi">
              Stage {stageNo} / {total}{" "}
              <span className="cfa-stagerow-sub text-text-mid">{"// "}{meta.short}</span>
            </span>
            <span className="text-signal">{pct}%</span>
          </div>

          {/* Track with fill + pinging head, both driven by pct */}
          <div className="cfa-track">
            <span className="track-fill" style={{ width: `${pct}%` }} />
            <span aria-hidden className="track-head" style={{ left: `${pct}%` }} />
          </div>
          <div aria-hidden className="cfa-ticks">
            {Array.from({ length: total }).map((_, i) => {
              const n = i + 1
              const cls = n < order ? "is-done" : n === order ? "is-cur" : ""
              return <span key={i} className={`cfa-tick ${cls}`} />
            })}
          </div>

          {/* THE HERO — the one committed brass surface */}
          <div className="field-brass mt-4 rounded-xl p-4">
            <p className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-brass-bright">
              <span aria-hidden className="relative inline-flex size-2.5">
                <span className="next-reticle absolute inset-0 rounded-full ring-1 ring-signal" />
                <span className="absolute inset-[3px] rounded-full bg-signal" />
              </span>
              {NEXT_MOVE.flag}
              <span className="text-text-mid">· {NEXT_MOVE.when}</span>
            </p>
            <h3 className="mt-2 font-display text-lg font-semibold tracking-tight text-text-hi">
              {NEXT_MOVE.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-text-mid">
              Your 18-hour course certificate ages out <strong className="text-warn">Sep&nbsp;3</strong>{" "}
              — it has to be under six months old on the day you file.
            </p>
            <p className="mt-2.5 flex items-start gap-1.5 text-sm text-text-mid">
              <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ok" />
              <span>{NEXT_MOVE.handled}</span>
            </p>
            <div className="cfa-cta mt-3.5 flex items-center gap-3">
              <span className="cfa-pseudobtn">{NEXT_MOVE.action}</span>
              <span className="text-xs text-text-mid">{NEXT_MOVE.effort}</span>
            </div>
          </div>

          {/* Already handled ledger */}
          <div className="mt-5 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em]">
            <span className="text-text-mid">Already handled</span>
            <span className="text-text-mid">17 / 24</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {HANDLED.map((h) => (
              <li
                key={h.plain}
                className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-white/[0.015] px-3 py-2"
              >
                <span className="flex items-center gap-2 text-[13px] text-text-mid">
                  {h.status === "satisfied" ? (
                    <Check aria-hidden className="size-3.5 shrink-0 text-ok" />
                  ) : (
                    <CircleDashed aria-hidden className="size-3.5 shrink-0 text-brass" />
                  )}
                  {h.plain}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-text-mid">{h.meta}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-text-mid">
            <CircleDashed aria-hidden className="size-3.5 shrink-0" />
            We track every requirement. Nothing files until it&apos;s ready.
          </p>
        </div>
      </div>

      {/* Floating chip over the bottom-right corner (static readout on mobile) */}
      <div aria-hidden className="cfa-chip">
        <span className="font-mono uppercase tracking-[0.12em] text-text-mid">You do</span>
        <span className="n font-display text-sm">1 thing</span>
        <span className="text-text-mid">this week</span>
      </div>

      <figcaption className="sr-only">
        Illustration of the Gun License NYC case file: it surfaces the single next action to take this
        week and lists the requirements already handled, with the applicant at stage {order} of {total}.
      </figcaption>
    </figure>
  )
}
