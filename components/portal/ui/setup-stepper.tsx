"use client"

import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

export function SetupStepper({
  current,
  finalLabel,
}: {
  current: 1 | 2 | 3
  finalLabel?: string
}) {
  const { messages } = usePortalI18n()
  const setup = messages.setup
  const steps = [setup.licensePath, setup.plan, finalLabel ?? setup.payment] as const

  return (
    <ol aria-label={setup.setup} className="portal-setup-stepper">
      {steps.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3
        const complete = step < current
        return (
          <li
            key={label}
            className="portal-setup-step"
            data-complete={complete}
            aria-current={step === current ? "step" : undefined}
          >
            <span className="portal-setup-step-number" aria-hidden>
              {complete ? "✓" : step}
            </span>
            <span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
