import { ShieldCheck, FileDown, Trash2, PencilLine } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { brand } from "@/config/brand"
import { DataRequestForm } from "@/components/portal/data-request-form"
import { getLocale, getMessages } from "@/lib/i18n"
import { interpolate } from "@/lib/i18n/interpolate"

export async function generateMetadata() {
  const t = await getMessages()
  return { title: t.ui.privacyTitle }
}

/**
 * PART A / Phase 3 — the applicant's own view of what we hold and what they can
 * ask us to do about it. The honesty here is the point: we say plainly which
 * records survive a deletion request and why, rather than implying a clean
 * wipe we don't actually perform.
 */
export default async function PortalPrivacyPage() {
  const [, myCase, messages, locale] = await Promise.all([
    requireRole(["client"]),
    getMyCase(),
    getMessages(),
    getLocale(),
  ])
  const t = messages.ui
  const kindMeta = {
    access: { label: t.dataCopy, icon: FileDown },
    correction: { label: t.dataCorrection, icon: PencilLine },
    deletion: { label: t.dataDeletion, icon: Trash2 },
  } as const
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
        <h1 className="text-2xl font-semibold tracking-tight">{t.privacyTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.privacyDescription}
        </p>
      </div>

      <section className="rounded-lg border bg-card p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-ok" /> {t.recordsHeld}
        </div>
        <ul className="mt-2 space-y-1.5 text-text-mid">
          <li>· {t.recordsRuleOne}</li>
          <li>· {t.recordsRuleTwo}</li>
          <li>· {t.recordsRuleThree}</li>
        </ul>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">{t.askSomething}</h2>
        <DataRequestForm />
      </section>

      <section className="rounded-lg border border-hairline bg-card/50 p-4 text-xs leading-relaxed text-text-mid">
        <p className="font-medium text-text-hi">{t.deletionTitle}</p>
        <p className="mt-1">
          {t.deletionBody}
        </p>
        <p className="mt-2">
          <span className="font-medium text-text-hi">{t.deletionKeepTitle}</span>{" "}{t.deletionKeepBody}
        </p>
        <p className="mt-2">
          {interpolate(t.deletionHonesty, { email: brand.contact.email })}
        </p>
      </section>

      {requests && requests.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium">{t.yourRequests}</h2>
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {requests.map((r) => {
              const meta = kindMeta[r.kind as keyof typeof kindMeta]
              const Icon = meta?.icon ?? FileDown
              return (
                <li key={r.id} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Icon className="size-3.5 text-brass" />
                      {meta?.label ?? r.kind}
                    </div>
                    <p className="mt-0.5 text-xs text-text-low">
                      {interpolate(t.filedDate, { date: new Date(r.requested_at).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { dateStyle: "medium" }) })}
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
