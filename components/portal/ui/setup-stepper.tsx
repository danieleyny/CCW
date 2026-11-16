const SETUP_STEPS = ["License path", "Plan", "Payment"] as const

export function SetupStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Setup" className="portal-setup-stepper">
      {SETUP_STEPS.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3
        return (
          <li
            key={label}
            className="portal-setup-step"
            aria-current={step === current ? "step" : undefined}
          >
            <span className="portal-setup-step-number" aria-hidden>
              {step}
            </span>
            <span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
