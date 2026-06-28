import { createAdminClient } from "@/lib/supabase/admin"
import { brand } from "@/config/brand"
import { ReferenceForm } from "@/components/public/reference-form"

export const metadata = { title: "Character reference — CARRY" }

export default async function ReferencePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: req } = await admin
    .from("reference_requests")
    .select("id, status, reference_id, case_id")
    .eq("token", token)
    .maybeSingle()

  if (!req) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The reference link may have expired or been mistyped. Please ask the applicant to resend it.
        </p>
      </Shell>
    )
  }

  const [{ data: ref }, { data: kase }] = await Promise.all([
    admin.from("character_references").select("name, relationship").eq("id", req.reference_id).single(),
    admin.from("cases").select("clients(full_name)").eq("id", req.case_id).single(),
  ])
  const applicant = (kase?.clients as unknown as { full_name: string } | null)?.full_name ?? "the applicant"

  // Mark opened (idempotent).
  if (req.status === "pending" || req.status === "sent") {
    await admin
      .from("reference_requests")
      .update({ status: "opened", opened_at: new Date().toISOString() })
      .eq("id", req.id)
  }
  const done = req.status === "submitted" || req.status === "notarized"

  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight">Character reference</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A quick confirmation for {applicant}&apos;s NYC carry-license application. No account needed.
      </p>
      <ReferenceForm
        token={token}
        referenceName={ref?.name ?? ""}
        relationship={ref?.relationship ?? null}
        applicant={applicant}
        alreadyDone={done}
      />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-svh w-full max-w-xl px-4 py-10">
      <div className="mb-6 font-display text-lg font-semibold tracking-tight">
        {brand.logo.mark} {brand.logo.wordmark}
      </div>
      {children}
    </div>
  )
}
