"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { CalendarDays, Check, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"
import { TeamLogoAvatar } from "@/components/brand/team-logo-avatar"

export function IntroCallNextStep({
  children,
  agentName,
  thenLabel,
  thenCaptured,
  thenTotal,
}: {
  children: ReactNode
  agentName: string | null
  thenLabel: string
  thenCaptured?: number
  thenTotal?: number
}) {
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(true)
  const { locale, messages } = usePortalI18n()
  const t = messages.concierge
  const agentFirst = agentName?.trim().split(/\s+/)[0] ?? null

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
      aria-label={t.nextStep}
    >
      <div className="intro-call-copy">
        <p className="intro-call-eyebrow"><Sparkles aria-hidden /> {t.nextStep}</p>
        <div className="intro-call-booking">{children}</div>
        <div className="intro-call-then">
          <span>{t.then}</span>
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
          <header><CalendarDays /> <b>{t.call}</b><span>{t.minutes}</span></header>
          <div className="intro-call-calendar-days"><span>{locale === "es" ? "L" : "M"}</span><span>{locale === "es" ? "M" : "T"}</span><span>{locale === "es" ? "X" : "W"}</span><span>{locale === "es" ? "J" : "T"}</span><span>{locale === "es" ? "V" : "F"}</span></div>
          <div className="intro-call-calendar-slots">
            <i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <div className="intro-call-sent"><Check /> {t.requestSent}</div>
        </div>

        <div className="intro-call-phone">
          <span className="intro-call-phone-speaker" />
          <Phone />
          <i className="intro-call-wave intro-call-wave-one" />
          <i className="intro-call-wave intro-call-wave-two" />
        </div>

        <div className="intro-call-agent-pill">
          {agentName ? (
            <span className="intro-call-agent-initials">{getInitials(agentName)}</span>
          ) : (
            <TeamLogoAvatar size="sm" />
          )}
          <p><small>{t.teamLabel}</small><b>{agentFirst ? interpolate(t.hereToHelp, { name: agentFirst }) : t.hereToHelpTeam}</b></p>
          <i />
        </div>

        <span className="intro-call-chip intro-call-chip-one"><ShieldCheck /> {t.caseReady}</span>
        <span className="intro-call-chip intro-call-chip-two"><MessageCircle /> {t.realAnswers}</span>
        <span className="intro-call-chip intro-call-chip-three"><Check /> {t.confirmed}</span>
        <Sparkles className="intro-call-spark intro-call-spark-one" />
        <Sparkles className="intro-call-spark intro-call-spark-two" />
      </div>
    </section>
  )
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}
