import { requireStaff } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { assembleApplicationValues } from "@/lib/forms/prepare"
import { getCaseSsn } from "@/lib/facts/ssn"
import { buildPortalWorksheet } from "@/lib/disclosures/worksheet-portal"
import { PortalWorksheet } from "@/components/admin/portal-worksheet"

export const metadata = { title: "Portal-entry worksheet" }

/**
 * Staff-only portal-entry worksheet — the values in the NYPD online portal's order and
 * format, with copy buttons and red flags, for transcription. We prepare + record; the
 * applicant files. This page is never shown to the applicant.
 */
export default async function WorksheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  const admin = createAdminClient()

  const [assembled, { data: kase }, { data: discRows }] = await Promise.all([
    assembleApplicationValues(admin, id),
    admin.from("cases").select("is_renewal, license_track, clients:client_id(full_name, email, phone)").eq("id", id).maybeSingle(),
    admin.from("requirement_answers").select("req_code, answers").eq("case_id", id).in("req_code", ["DSC-01", "QUE-01"]),
  ])
  const client = (kase?.clients as unknown as { full_name: string; email: string | null; phone: string | null } | null) ?? null
  const disclosures =
    (discRows ?? []).find((r) => r.req_code === "DSC-01")?.answers ??
    (discRows ?? []).find((r) => r.req_code === "QUE-01")?.answers ??
    {}

  if (!assembled) {
    return <p className="rounded-lg border border-hairline bg-card p-6 text-sm text-text-mid">No application data yet for this case.</p>
  }

  const ssnLast4 = (await getCaseSsn(admin, id, "portal worksheet — SSN last 4")) ?? ""
  const sections = buildPortalWorksheet(assembled.values, disclosures as Record<string, unknown>, {
    isRenewal: !!kase?.is_renewal,
    phone: client?.phone,
    email: client?.email,
    ssnLast4,
  })

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-1">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Portal-entry worksheet</h1>
        <p className="mt-1 text-sm text-text-mid">
          Transcribe these into licensing.nypdonline.org in this order and format.
        </p>
      </div>
      <PortalWorksheet sections={sections} applicant={client?.full_name ?? "Applicant"} />
    </div>
  )
}
