"use client"

import type { ReactNode } from "react"
import { Check, type LucideIcon } from "lucide-react"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

export type ChoiceCardFact = {
  label: string
  value: string
  note: string
}

export function ChoiceCard({
  id,
  name,
  value,
  selected,
  current,
  disabled,
  eyebrow,
  title,
  description,
  facts = [],
  Icon,
  onChange,
  tone = "light",
  badge,
  currentLabel,
  className,
  children,
}: {
  id: string
  name: string
  value: string
  selected: boolean
  current: boolean
  disabled?: boolean
  eyebrow: string
  title: string
  description: string
  facts?: ChoiceCardFact[]
  Icon: LucideIcon
  onChange: () => void
  tone?: "light" | "featured-dark"
  badge?: string
  currentLabel?: string
  className?: string
  children?: ReactNode
}) {
  const { messages } = usePortalI18n()
  const descriptionId = `${id}-description`

  return (
    <label
      className={["portal-choice-card", className].filter(Boolean).join(" ")}
      data-selected={selected}
      data-tone={tone}
      htmlFor={id}
      onClick={() => {
        if (!disabled) onChange()
      }}
    >
      <input
        className="portal-choice-input sr-only"
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={selected}
        disabled={disabled}
        aria-describedby={descriptionId}
        onChange={onChange}
      />
      <span className="portal-choice-top">
        <span className="portal-choice-icon" aria-hidden>
          <Icon size={22} strokeWidth={1.65} />
        </span>
        <span className="portal-choice-tags">
          {badge && <span className="portal-choice-badge">{badge}</span>}
          {current && <span className="portal-choice-current">{currentLabel ?? messages.setup.current}</span>}
        </span>
        <span className="portal-choice-radio" aria-hidden>
          <Check size={15} strokeWidth={2.2} />
        </span>
      </span>

      {children ? (
        <div id={descriptionId} className="portal-choice-custom">
          {children}
        </div>
      ) : (
        <>
        <span className="portal-choice-eyebrow portal-t-eyebrow">{eyebrow}</span>
        <span className="portal-choice-title portal-t-card">{title}</span>
        <span id={descriptionId} className="portal-choice-description portal-t-body">
          {description}
        </span>

        <span className="portal-choice-facts">
          {facts.map((fact) => (
            <span className="portal-choice-fact" key={fact.label}>
              <span className="portal-choice-fact-label portal-t-label">{fact.label}</span>
              <span className="portal-t-value">{fact.value}</span>
              <span className="portal-choice-fact-note">{fact.note}</span>
            </span>
          ))}
        </span>
        </>
      )}
    </label>
  )
}
