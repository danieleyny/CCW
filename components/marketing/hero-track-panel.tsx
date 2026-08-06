"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { ArrowRight } from "lucide-react"

/**
 * HERO V4 — the instrument. One question, the three real tracks from
 * config/stages.ts JURISDICTION (resident / business / non_resident). Picking one
 * shows TWO CLOCKS: yours (prep — the half you control) and the NYPD's
 * (~6 months, sourced to the NYPD License Division). What differs by track is
 * your half, and what drives it is how many people you have to chase.
 *
 * HONEST NUMBERS (HERO_V4_PROMPT §7 — the numbers must be true):
 *  - The reference counts come straight from lib/intake/schema.ts
 *    `requiredReferences`: carry = 4, premises = 2. Non-resident Special Carry
 *    runs the carry path, so it is 4 — NOT the "0" an earlier draft invented.
 *    We differentiate that track by what it uniquely requires (a home-state
 *    license + a documented NYC business nexus), never by a false zero.
 *  - No invented durations. "~6 months" is the sourced NYPD figure
 *    (content/facts.ts FACTS.timeline); the prep half is described the way
 *    /timeline already frames it, in approved qualitative language ("weeks if
 *    you keep at it, months if you start and stop") — no fabricated week ranges.
 *
 * The panel shows REQUIREMENTS, never an eligibility determination. It owns only
 * the track state; the rest of the hero is server-rendered. Picking a track
 * rewrites the single brass CTA's href (#hero-cta) so the choice carries into
 * the quiz. Default is `resident`, matching the server-rendered CTA + panel.
 */

type Track = "resident" | "business" | "non_resident"

type TrackData = {
  n: string
  name: string
  /** cyan (your-prep) share of the two-clock bar — larger when more to chase */
  grow: number
  chaseN: string
  chaseD: ReactNode
  stand: string
}

const TRACKS: Record<Track, TrackData> = {
  resident: {
    n: "01",
    name: "NYC resident",
    grow: 30,
    chaseN: "4",
    chaseD: (
      <>
        <b>Four notarized character references</b> &mdash; plus an affidavit from every adult in your
        home.
      </>
    ),
    stand: "Proof of NYC residence",
  },
  business: {
    n: "02",
    name: "NYC business owner",
    grow: 22,
    chaseN: "2",
    chaseD: (
      <>
        <b>Two notarized character references</b> &mdash; plus records for the business and its
        premises.
      </>
    ),
    stand: "Business records & premises",
  },
  non_resident: {
    n: "03",
    name: "Non-resident",
    grow: 30,
    chaseN: "4",
    chaseD: (
      <>
        <b>Four notarized character references</b> &mdash; plus a home-state carry license and a
        documented NYC business nexus.
      </>
    ),
    stand: "NYC business nexus + home-state license",
  },
}

const ORDER: Track[] = ["resident", "business", "non_resident"]

export function HeroTrackPanel() {
  const [track, setTrack] = useState<Track>("resident")
  const t = TRACKS[track]

  // Carry the chosen track into the single brass CTA (server-rendered as a plain
  // <a id="hero-cta"> so this DOM href update actually changes where it goes).
  useEffect(() => {
    const cta = document.getElementById("hero-cta")
    if (cta) cta.setAttribute("href", `/eligibility?track=${track}`)
  }, [track])

  return (
    <div className="hero-panel">
      <div className="hero-pq">
        <b aria-hidden />
        <span>Which one are you?</span>
      </div>

      <div className="hero-tracks" role="group" aria-label="Choose your track">
        {ORDER.map((key) => {
          const d = TRACKS[key]
          return (
            <button
              key={key}
              type="button"
              className="hero-track"
              aria-pressed={track === key}
              onClick={() => setTrack(key)}
            >
              <span className="tn">{d.n}</span>
              <span className="tt">{d.name}</span>
            </button>
          )
        })}
      </div>

      {/* ── two clocks ── */}
      <div className="hero-sec">
        <div className="hero-sech">
          <span className="k">Two clocks, not one</span>
          <span key={track} className="v hero-flip">
            {t.name}
          </span>
        </div>

        <div className="hero-clock">
          <span
            className="hero-seg you"
            style={{ flexGrow: t.grow }}
            aria-hidden
          />
          <span
            className="hero-seg pd"
            style={{ flexGrow: 100 - t.grow }}
            aria-hidden
          />
          <svg className="hero-seal" viewBox="0 0 24 24" aria-hidden>
            <circle className="halo" cx="12" cy="12" r="11" />
            <circle className="csr" cx="12" cy="12" r="8" strokeWidth="1.2" />
            <circle className="csr2" cx="12" cy="12" r="5" strokeWidth="1" />
            <circle className="csc" cx="12" cy="12" r="2.4" />
          </svg>
        </div>

        <div className="hero-legend">
          <div className="hero-leg you">
            <div className="lk">
              <i aria-hidden />
              Your clock
            </div>
            <div className="lv">Starts today</div>
            <div className="ln">Weeks if you keep at it &mdash; months if you start and stop.</div>
          </div>
          <div className="hero-leg pd">
            <div className="lk">
              <i aria-hidden />
              The NYPD&rsquo;s
            </div>
            <div className="lv">~6 months</div>
            <div className="ln">
              From a <em>complete</em> submission. Not ours to move.
            </div>
          </div>
        </div>
      </div>

      {/* ── the driver: people to chase ── */}
      <div className="hero-sec">
        <div className="hero-sech">
          <span className="k">People you have to chase</span>
        </div>
        <div className="hero-chase">
          <span key={track} className="big hero-flip">
            {t.chaseN}
          </span>
          <span className="cd">{t.chaseD}</span>
        </div>
      </div>

      {/* ── what proves your standing ── */}
      <div className="hero-sec">
        <div className="hero-sech">
          <span className="k">What proves your standing</span>
        </div>
        <div key={track} className="hero-stand hero-flip">
          {t.stand}
        </div>
      </div>

      <p className="hero-src">
        NYPD timing: NYPD License Division &middot; reference rule: 38 RCNY ch. 5. Prep time is an
        estimate, not a promise.
      </p>
      <Link className="hero-pfoot" href="/requirements">
        See every requirement for this track
        <ArrowRight aria-hidden />
      </Link>
    </div>
  )
}
