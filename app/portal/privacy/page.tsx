import { ShieldCheck, FileDown, Trash2, PencilLine } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { brand } from "@/config/brand"
import { DataRequestForm } from "@/components/portal/data-request-form"

export const metadata = { title: "Your data" }

const KIND_META = {
  access: { label: "A copy of your data", icon: FileDown },
  correction: { label: "A correction", icon: PencilLine },
  deletion: { label: "Deletion", icon: Trash2 },
} as const

/**
 * PART A / Phase 3 — the applicant's own view of what we hold and what they can
 * ask us to do about it. The honesty here is the point: we say plainly which
 * records survive a deletion request and why, rather than implying a clean
 * wipe we don't actually perform.
 */
export default async function PortalPrivacyPage() {
  await requireRole(["client"])
  const myCase = await getMyCase()
  const supabase = await createClient()

  const { data: requests } = myCase
    ? await supabase
        .from("data_requests")
        .select("id, kind, status, requested_at, resolution_note")
        .eq("case_id", myCase.id)
        .order("requested_at", { ascending: false })
    : { data: [] }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What we hold for your application, and what you can ask us to do with it.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-ok" /> How your records are held
        </div>
        <ul className="mt-2 space-y-1.5 text-text-mid">
          <li>· Only you and our staff can see your case. Instructors never see your disclosures.</li>
          <li>· Documents live in access-controlled storage and are encrypted at rest and in transit.</li>
          <li>· We never sell your information, and we don&apos;t share it with instructors beyond what they need to teach you.</li>
        </ul>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">Ask us for something</h2>
        <DataRequestForm />
      </section>

      <section className="rounded-lg border border-hairline bg-card/50 p-4 text-xs leading-relaxed text-text-mid">
        <p className="font-medium text-text-hi">What deletion actually does</p>
        <p className="mt-1">
          We remove your disclosures, intake answers, questionnaire answers, uploaded and generated
          documents, household and reference records, and any notes on your case — including the
          files themselves, not just the database rows.
        </p>
        <p className="mt-2">
          <span className="font-medium text-text-hi">One thing we keep, and why:</span> when you
          e-signed a document, we recorded a tamper-evident record of that signing. We keep the
          proof-of-signing entry — the timestamp, the document fingerprint, and the consent wording
          — because it&apos;s the evidence that a signature was validly obtained, and it contains
          none of your personal story. We delete your signature image and strip the IP address and
          device details from it.
        </p>
        <p className="mt-2">
          We&apos;d rather tell you that plainly than claim a clean wipe we don&apos;t perform. If
          you have questions, email {brand.contact.email}.
        </p>
      </section>

      {requests && requests.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium">Your requests</h2>
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {requests.map((r) => {
              const meta = KIND_META[r.kind as keyof typeof KIND_META]
              const Icon = meta?.icon ?? FileDown
              return (
                <li key={r.id} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Icon className="size-3.5 text-brass" />
                      {meta?.label ?? r.kind}
                    </div>
                    <p className="mt-0.5 text-xs text-text-low">
                      Filed {new Date(r.requested_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                      {r.resolution_note ? ` · ${r.resolution_note}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-mid">
                    {r.status}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
