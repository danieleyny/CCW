"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { CalendarDays, Check, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react"

export function IntroCallNextStep({
  children,
  agentFirst,
  thenLabel,
  thenCaptured,
  thenTotal,
}: {
  children: ReactNode
  agentFirst: string | null
  thenLabel: string
  thenCaptured?: number
  thenTotal?: number
}) {
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(true)

  useEffect(() => {
    const element = root.current
    if (!element || !("IntersectionObserver" in window)) return
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry?.isIntersecting ?? true),
      { threshold: 0.12 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const hasProgress = typeof thenCaptured === "number" && typeof thenTotal === "number" && thenTotal > 0
  const progress = hasProgress ? Math.min(100, Math.round((thenCaptured / thenTotal) * 100)) : 0

  return (
    <section
      ref={root}
      id="next-step"
      className="intro-call-next-step scroll-mt-24"
      data-active={active ? "true" : "false"}
      aria-label="Your next step"
    >
      <div className="intro-call-copy">
        <p className="intro-call-eyebrow"><Sparkles aria-hidden /> Your next step</p>
        <div className="intro-call-booking">{children}</div>
        <div className="intro-call-then">
          <span>Then</span>
          <strong>{thenLabel}</strong>
          {hasProgress ? <b>{thenCaptured}/{thenTotal}</b> : null}
          {hasProgress ? <i aria-hidden><span style={{ width: `${progress}%` }} /></i> : null}
        </div>
      </div>

      <div className="intro-call-art" aria-hidden>
        <span className="intro-call-glow intro-call-glow-one" />
        <span className="intro-call-glow intro-call-glow-two" />
        <svg className="intro-call-path" viewBox="0 0 530 270" fill="none">
          <path d="M93 126C182 18 342 38 416 136" />
        </svg>

        <div className="intro-call-calendar">
          <span className="intro-call-calendar-pins"><i /><i /></span>
          <header><CalendarDays /> <b>Intro call</b><span>30 min</span></header>
          <div className="intro-call-calendar-days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span></div>
          <div className="intro-call-calendar-slots">
            <i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <div className="intro-call-sent"><Check /> Request sent</div>
        </div>

        <div className="intro-call-phone">
          <span className="intro-call-phone-speaker" />
          <Phone />
          <i className="intro-call-wave intro-call-wave-one" />
          <i className="intro-call-wave intro-call-wave-two" />
        </div>

        <div className="intro-call-agent-pill">
          <span>GL</span>
          <p><small>Your concierge team</small><b>{agentFirst ? `${agentFirst} is here to help` : "Here to help"}</b></p>
          <i />
        </div>

        <span className="intro-call-chip intro-call-chip-one"><ShieldCheck /> Case-ready</span>
        <span className="intro-call-chip intro-call-chip-two"><MessageCircle /> Real answers</span>
        <span className="intro-call-chip intro-call-chip-three"><Check /> Confirmed</span>
        <Sparkles className="intro-call-spark intro-call-spark-one" />
        <Sparkles className="intro-call-spark intro-call-spark-two" />
      </div>
    </section>
  )
}
