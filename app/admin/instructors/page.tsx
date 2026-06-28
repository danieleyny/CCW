import { ShieldCheck, ShieldAlert, MapPin } from "lucide-react"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { boroughFromLatLng } from "@/lib/geo/nyc"
import { money } from "@/lib/format"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { setInstructorVerified } from "./actions"

export const metadata = { title: "Instructors" }

export default async function AdminInstructorsPage() {
  await requireStaff()
  const supabase = await createClient()
  const { data: instructors } = await supabase
    .from("instructors")
    .select("id, name, email, dcjs_id, verified, service_radius_mi, price_18h_cents, lat, lng, jurisdictions, profile_id, rating_avg, rating_count")
    .order("verified", { ascending: true })
    .order("created_at", { ascending: false })

  const rows = instructors ?? []
  const pending = rows.filter((i) => !i.verified).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instructors"
        description={`Verify DCJS credentials before an instructor appears to clients. ${pending} awaiting verification.`}
      />
      <div className="space-y-2">
        {rows.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{i.name}</span>
                {i.verified ? (
                  <span className="inline-flex items-center gap-1 rounded bg-ok/12 px-1.5 py-0.5 text-[10px] text-ok">
                    <ShieldCheck className="size-3" /> verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-warn/12 px-1.5 py-0.5 text-[10px] text-warn">
                    <ShieldAlert className="size-3" /> pending
                  </span>
                )}
                {!i.profile_id && (
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-low">no account</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-mid">
                <span>{i.email ?? "—"}</span>
                <span>DCJS: {i.dcjs_id ?? "—"}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {boroughFromLatLng(i.lat, i.lng) ?? "no area"} · {i.service_radius_mi}mi
                </span>
                <span>{i.price_18h_cents ? money(i.price_18h_cents) : "—"}</span>
                <span>{(i.jurisdictions ?? []).join(", ")}</span>
              </div>
            </div>
            <form action={setInstructorVerified}>
              <input type="hidden" name="id" value={i.id} />
              <input type="hidden" name="verified" value={i.verified ? "false" : "true"} />
              <Button type="submit" size="sm" variant={i.verified ? "outline" : "default"}>
                {i.verified ? "Un-verify" : "Verify"}
              </Button>
            </form>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            No instructors yet.
          </p>
        )}
      </div>
    </div>
  )
}
