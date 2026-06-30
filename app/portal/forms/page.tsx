import Link from "next/link"
import { Download, FileText, ArrowRight } from "lucide-react"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import type { WizardAnswers } from "@/lib/intake/answers"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Your documents" }

export default async function FormsPage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const supabase = await createClient()
  const { data: session } = await supabase
    .from("intake_sessions")
    .select("answers, completed_at")
    .eq("case_id", myCase.id)
    .maybeSingle()
  const answers = (session?.answers ?? {}) as WizardAnswers
  const hasArrests = (answers.arrests?.length ?? 0) > 0
  const hasCohabitants = (answers.cohabitants?.length ?? 0) > 0

  const docs = [
    { key: "affirmation", title: "Affirmation of Understanding", desc: "Acknowledges NYC carry rules and prohibited locations. Sign.", show: true, notarize: false },
    { key: "safe-storage", title: "Safe-Storage Attestation", desc: "Confirms your approved safe and storage practice. Sign.", show: true, notarize: false },
    { key: "social-media", title: "3-Year Social-Media Disclosure", desc: "Your accounts from the last three years (from intake). Sign.", show: true, notarize: false },
    { key: "arrest-narratives", title: "Written Explanations", desc: "Formatted explanations for your disclosed matters. Sign.", show: hasArrests, notarize: false },
    { key: "court-letters", title: "Certificate-of-Disposition Requests", desc: "Ready-to-mail letters to the court clerk, one per matter.", show: hasArrests, notarize: false },
    { key: "sole-occupancy", title: "Sole-Occupancy Statement", desc: "If you live alone. Sign and notarize.", show: !hasCohabitants, notarize: true },
  ].filter((d) => d.show)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents we prepared for you</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-filled from your intake answers. Download, sign (and notarize where noted), then upload
          them under Documents.
        </p>
      </div>

      {!session?.completed_at && (
        <Link
          href="/portal/intake"
          className="flex items-center justify-between rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn"
        >
          Finish your intake first so these come out fully pre-filled.
          <ArrowRight className="size-4" />
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {docs.map((d) => (
          <Card key={d.key}>
            <CardContent className="flex h-full flex-col p-5">
              <FileText className="size-5 text-signal" />
              <h3 className="mt-2 text-sm font-semibold">{d.title}</h3>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">{d.desc}</p>
              <div className="mt-3 flex items-center gap-2">
                <Button asChild size="sm">
                  <a href={`/portal/forms/${d.key}`} target="_blank" rel="noreferrer">
                    <Download className="size-4" /> Download
                  </a>
                </Button>
                {d.notarize && <span className="text-[10px] uppercase tracking-wide text-brass">notarize</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Character references and cohabitant affidavits are handled on the{" "}
        <Link href="/portal/people" className="text-signal underline">People</Link> page — each person gets
        their own self-serve link, so you don&apos;t have to prepare those yourself.
      </p>
    </div>
  )
}
