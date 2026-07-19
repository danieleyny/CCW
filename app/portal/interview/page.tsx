import { CheckCircle2, MessageCircleQuestion, ClipboardCheck } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import {
  INTERVIEW_OVERVIEW,
  INTERVIEW_SECTIONS,
  PRACTICE_QUESTIONS,
  INTERVIEW_DISCLAIMER,
} from "@/content/interview"

export const metadata = { title: "Interview prep" }

/**
 * PART C / Phase 9 — the applicant's interview-prep module. Content-driven,
 * reassuring, candor-first. Prep, never coaching to mislead.
 */
export default async function InterviewPrepPage() {
  await requireRole(["client"])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your interview, without the nerves</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-mid">{INTERVIEW_OVERVIEW}</p>
      </div>

      {INTERVIEW_SECTIONS.map((s) => (
        <Card key={s.title}>
          <CardContent className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardCheck className="size-4 text-brass" /> {s.title}
            </h2>
            {s.intro && <p className="mt-1 text-xs text-text-mid">{s.intro}</p>}
            <ul className="mt-3 space-y-2">
              {s.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-text-hi">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <div>
        <h2 className="engraved mb-2 flex items-center gap-2 text-text-low">
          <MessageCircleQuestion className="size-3.5" /> Questions you might hear
        </h2>
        <div className="space-y-2">
          {PRACTICE_QUESTIONS.map((p) => (
            <details key={p.q} className="rounded-lg border bg-card">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{p.q}</summary>
              <p className="border-t border-hairline px-4 py-3 text-sm text-text-mid">{p.approach}</p>
            </details>
          ))}
        </div>
      </div>

      <p className="rounded-md border border-hairline bg-surface-2/40 p-3 text-xs leading-relaxed text-text-low">
        {INTERVIEW_DISCLAIMER}
      </p>
    </div>
  )
}
