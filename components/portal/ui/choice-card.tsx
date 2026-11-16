"use client"

import { Check, type LucideIcon } from "lucide-react"

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
  facts,
  Icon,
  onChange,
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
  facts: ChoiceCardFact[]
  Icon: LucideIcon
  onChange: () => void
}) {
  const descriptionId = `${id}-description`

  return (
    <>
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
      <label className="portal-choice-card" data-selected={selected} htmlFor={id}>
        <span className="portal-choice-top">
          <span className="portal-choice-icon" aria-hidden>
            <Icon size={22} strokeWidth={1.65} />
          </span>
          {current && <span className="portal-choice-current">Current</span>}
          <span className="portal-choice-radio" aria-hidden>
            <Check size={15} strokeWidth={2.2} />
          </span>
        </span>

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
      </label>
    </>
  )
}
