import Link from "next/link"
import { Download, ArrowRight } from "lucide-react"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import type { WizardAnswers } from "@/lib/intake/answers"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FormsSigning, type FormDoc } from "@/components/portal/forms-signing"

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

  // Signature on file? Which signature-only forms are already filed?
  const [{ data: sig }, { data: reqs }] = await Promise.all([
    supabase.from("signatures").select("id").eq("case_id", myCase.id).eq("signer_key", "applicant").maybeSingle(),
    supabase.from("case_requirements").select("req_code, status").eq("case_id", myCase.id).in("req_code", ["AFF-01", "SOC-01"]),
  ])
  const filedSet = new Set((reqs ?? []).filter((r) => r.status === "satisfied").map((r) => r.req_code))

  const docs: FormDoc[] = [
    { key: "affirmation", title: "Affirmation of Understanding", desc: "Acknowledges NYC carry rules and prohibited locations.", notarize: false, fileable: true, filed: filedSet.has("AFF-01") },
    { key: "safe-storage", title: "Safe-Storage Attestation", desc: "Confirms your approved safe and storage practice.", notarize: false, fileable: false, filed: false },
    { key: "social-media", title: "3-Year Social-Media Disclosure", desc: "Your accounts from the last three years (from intake).", notarize: false, fileable: true, filed: filedSet.has("SOC-01") },
    { key: "arrest-narratives", title: "Written Explanations", desc: "Formatted explanations for your disclosed matters.", notarize: false, fileable: false, filed: false, show: hasArrests },
    { key: "court-letters", title: "Certificate-of-Disposition Requests", desc: "Ready-to-mail letters to the court clerk, one per matter.", notarize: false, fileable: false, filed: false, show: hasArrests },
    { key: "sole-occupancy", title: "Sole-Occupancy Statement", desc: "If you live alone. Comes pre-signed; notarize before filing.", notarize: true, fileable: false, filed: false, show: !hasCohabitants },
  ].filter((d) => (d as { show?: boolean }).show !== false).map(({ ...d }) => d as FormDoc)

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

      {/* The one-click deliverable — worksheet + upload guide + assembled docs */}
      <Card className="brass-edge">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Your filing pack</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              One guided PDF: the answers to type into the NYPD portal in the form&apos;s own order, a
              guide to which document goes where, and all your assembled documents. You file it
              yourself — we prepare and organize, we never submit it for you.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Button asChild>
              <a href="/portal/filing-pack" target="_blank" rel="noreferrer">
                <Download className="size-4" /> Download filing pack
              </a>
            </Button>
            <a
              href="/portal/packet"
              target="_blank"
              rel="noreferrer"
              className="text-center text-[11px] text-text-low underline"
            >
              Just the documents
            </a>
          </div>
        </CardContent>
      </Card>

      <FormsSigning docs={docs} hasSignature={!!sig} />

      <p className="text-xs text-muted-foreground">
        Character references and cohabitant affidavits are handled on the{" "}
        <Link href="/portal/people" className="text-signal underline">People</Link> page — each person gets
        their own self-serve link, so you don&apos;t have to prepare those yourself.
      </p>
    </div>
  )
}
