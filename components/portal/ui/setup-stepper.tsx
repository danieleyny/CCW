export function SetupStepper({
  current,
  finalLabel = "Payment",
}: {
  current: 1 | 2 | 3
  finalLabel?: string
}) {
  const steps = ["License path", "Plan", finalLabel] as const

  return (
    <ol aria-label="Setup" className="portal-setup-stepper">
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
