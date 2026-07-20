import Link from "next/link"
import { ShieldCheck, ShieldAlert, MapPin, Star, ArrowRight, ClipboardCheck } from "lucide-react"
import { getMyInstructor, getMyTrainingLocations } from "@/lib/instructor"
import { money } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

export const metadata = { title: "Instructor dashboard" }

export default async function InstructorDashboard() {
  const me = await getMyInstructor()
  if (!me) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-text-mid">
          Your instructor profile isn&apos;t set up yet. Please contact support.
        </CardContent>
      </Card>
    )
  }
  const locations = await getMyTrainingLocations(me.id)

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Instructor</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{me.name.split(" ")[0]}</h1>
      </div>

      {/* Onboarding gate — required before going live (Phase 13). */}
      {!me.onboarding_completed_at && (
        <Link
          href="/instructor/onboarding"
          className="flex items-center justify-between gap-2 rounded-md border border-brass/40 bg-brass/10 px-4 py-3 text-sm text-brass-bright transition-colors hover:bg-brass/15"
        >
          <span className="flex items-center gap-2">
            <ClipboardCheck className="size-4" /> Complete your platform onboarding to go live — a few minutes.
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* Verification status */}
      {me.verified ? (
        <div className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
          <ShieldCheck className="size-4" /> Verified — you appear to clients in your service area.
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <ShieldAlert className="size-4" /> Pending verification — an admin reviews your DCJS
          credential before you appear to clients.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Service radius" value={`${me.service_radius_mi} mi`} />
        <Stat label="18-hr price" value={me.price_18h_cents ? money(me.price_18h_cents) : "—"} />
        <Stat
          label="Rating"
          value={me.rating_count ? `${me.rating_avg ?? "—"} (${me.rating_count})` : "—"}
          icon={<Star className="size-4 text-brass" />}
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Profile</h2>
            <Link href="/instructor/profile" className="text-xs text-signal hover:underline">
              Edit
            </Link>
          </div>
          <dl className="grid gap-1.5 text-sm">
            <Row k="DCJS credential" v={me.dcjs_id ?? "Not set"} />
            <Row k="Jurisdictions" v={(me.jurisdictions ?? []).join(", ")} />
            <Row k="Bio" v={me.bio ?? "Not set"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Training locations</h2>
            <Link href="/instructor/profile" className="text-xs text-signal hover:underline">
              Manage <ArrowRight className="inline size-3" />
            </Link>
          </div>
          {locations.length === 0 ? (
            <p className="text-sm text-text-mid">No locations yet — add a classroom or range.</p>
          ) : (
            <ul className="space-y-2">
              {locations.map((l) => (
                <li key={l.id} className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-signal" />
                  <span className="font-medium">{l.label}</span>
                  {l.is_range && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-mid">range</span>}
                  {l.address && <span className="text-text-low">· {l.address}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5">{icon}</div>
        <div className="mt-1 font-display text-xl font-semibold">{value}</div>
        <div className="engraved mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-text-low">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  )
}
