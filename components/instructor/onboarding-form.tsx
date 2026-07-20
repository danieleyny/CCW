"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ShieldCheck } from "lucide-react"
import { completeOnboarding } from "@/app/instructor/onboarding/actions"
import { ONBOARDING_ACKNOWLEDGEMENTS, ONBOARDING_QUIZ } from "@/content/trainer-onboarding"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function OnboardingForm() {
  const router = useRouter()
  const [pending, start] = useTransition()
  // Track wrong quiz answers to highlight after a failed submit.
  const [wrong, setWrong] = useState<Set<string>>(new Set())

  return (
    <form
      action={(fd) =>
        start(async () => {
          // Client-side quiz check just to highlight; the server re-checks.
          const bad = new Set<string>()
          for (const q of ONBOARDING_QUIZ) {
            if (fd.get(`quiz_${q.key}`) !== String(q.answer)) bad.add(q.key)
          }
          setWrong(bad)
          const res = await completeOnboarding(fd)
          if (res.error) toast.error(res.error)
          else {
            toast.success("Onboarding complete — you're clear to go live once verified.")
            router.push("/instructor")
            router.refresh()
          }
        })
      }
      className="space-y-6"
    >
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Acknowledge each rule</h2>
        {ONBOARDING_ACKNOWLEDGEMENTS.map((a) => (
          <label key={a.key} className="flex items-start gap-2.5 rounded-md border bg-card p-3 text-sm">
            <input type="checkbox" name={`ack_${a.key}`} className="mt-0.5 size-4 shrink-0 rounded border-input" />
            <span>{a.label}</span>
          </label>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Three quick questions</h2>
        {ONBOARDING_QUIZ.map((q) => (
          <div
            key={q.key}
            className={cn("rounded-md border bg-card p-3", wrong.has(q.key) && "border-danger/50 bg-danger/5")}
          >
            <p className="text-sm font-medium">{q.q}</p>
            <div className="mt-2 space-y-1.5">
              {q.options.map((opt, i) => (
                <label key={i} className="flex items-start gap-2 text-sm">
                  <input type="radio" name={`quiz_${q.key}`} value={i} className="mt-0.5 size-4 shrink-0" />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {wrong.has(q.key) && <p className="mt-2 text-xs text-danger">{q.explain}</p>}
          </div>
        ))}
      </section>

      <Button type="submit" disabled={pending}>
        <ShieldCheck className="size-4" /> Complete onboarding
      </Button>
    </form>
  )
}
