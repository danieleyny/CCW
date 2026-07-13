import Link from "next/link"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import {
  RequirementsRegistry,
  type RegistryVersion,
} from "@/components/admin/requirements-registry"

export const metadata = { title: "Requirements registry" }

export default async function RequirementsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ j?: string }>
}) {
  await requireStaff()
  const sp = await searchParams
  const supabase = await createClient()

  const { data: jurisdictions } = await supabase
    .from("jurisdiction_profiles")
    .select("id, key, label, active")
    .order("key", { ascending: true })

  const selectedKey = sp.j ?? "nyc"
  const selected = (jurisdictions ?? []).find((j) => j.key === selectedKey) ?? jurisdictions?.[0]

  let versions: RegistryVersion[] = []
  if (selected) {
    const { data } = await supabase
      .from("requirements")
      .select(
        "id, req_code, title, description, authority, severity, trigger_cond, document_type, effective_from, effective_to"
      )
      .eq("jurisdiction_id", selected.id)
      .order("req_code", { ascending: true })
      .order("effective_from", { ascending: false })
    versions = (data ?? []) as RegistryVersion[]
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requirements registry"
        description="The versioned, authority-cited compliance registry. A rule change is a dated data edit — retire a version and add a new one; future cases pick up the change while existing cases keep their prior version."
      />
      <div className="rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-xs text-warn">
        ⚠ These citations were corrected against NYPD&apos;s checklist, 38 RCNY, and DCJS standards
        (July 2026) but still require attorney sign-off before client-facing filing use.{" "}
        <Link href="/admin/legal" className="font-medium underline">
          Open the legal-verification register →
        </Link>
      </div>
      <RequirementsRegistry
        jurisdictions={(jurisdictions ?? []).map((j) => ({ key: j.key, label: j.label, active: j.active }))}
        selectedKey={selected?.key ?? "nyc"}
        versions={versions}
      />
    </div>
  )
}
