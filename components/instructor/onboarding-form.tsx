"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ShieldCheck } from "lucide-react"
import { completeOnboarding } from "@/app/instructor/onboarding/actions"
import { ONBOARDING_ACKNOWLEDGEMENTS } from "@/content/trainer-onboarding"
import { Button } from "@/components/ui/button"

export function OnboardingForm() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [agreed, setAgreed] = useState<Set<string>>(new Set())
  const allAgreed = agreed.size === ONBOARDING_ACKNOWLEDGEMENTS.length

  function toggle(key: string, checked: boolean) {
    setAgreed((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await completeOnboarding(fd)
          if (res.error) toast.error(res.error)
          else {
            toast.success("You're all set — clear to go live once verified.")
            router.push("/instructor")
            router.refresh()
          }
        })
      }
      className="space-y-6"
    >
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Agree to each rule</h2>
        {ONBOARDING_ACKNOWLEDGEMENTS.map((a) => (
          <label key={a.key} className="flex items-start gap-2.5 rounded-md border bg-card p-3 text-sm">
            <input
              type="checkbox"
              name={`ack_${a.key}`}
              checked={agreed.has(a.key)}
              onChange={(e) => toggle(a.key, e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-input"
            />
            <span>{a.label}</span>
          </label>
        ))}
      </section>

      <Button type="submit" disabled={pending || !allAgreed}>
        <ShieldCheck className="size-4" /> {allAgreed ? "Agree & continue" : "Agree to every rule to continue"}
      </Button>
    </form>
  )
}
