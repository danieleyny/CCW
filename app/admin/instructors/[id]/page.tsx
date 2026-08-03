import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ShieldCheck, ShieldAlert, MapPin, Star } from "lucide-react"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { boroughFromLatLng } from "@/lib/geo/nyc"
import { money, formatDate, formatDateTime } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { setInstructorVerified, setInstructorPublicListing } from "../actions"

const NYC_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"]

export const metadata = { title: "Instructor" }

/**
 * B2B — admin instructor detail. Read-only profile / verification / service area
 * / engagements / bookings / payout status / performance, mirroring the case
 * file's shape. No new instructor-side exposure; verify/un-verify lives here too.
 */
export default async function AdminInstructorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireStaff()
  const supabase = await createClient()

  const { data: inst } = await supabase.from("instructors").select("*").eq("id", id).maybeSingle()
  if (!inst) notFound()

  const [engRes, bookingRes, locRes, reviewRes, activityRes] = await Promise.all([
    supabase
      .from("engagements")
      .select("id, status, type, created_at, cases(id, clients(full_name))")
      .eq("instructor_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, type, status, starts_at, case_id")
      .eq("instructor_id", id)
      .order("starts_at", { ascending: false })
      .limit(10),
    supabase.from("training_locations").select("id, label, address, is_range").eq("instructor_id", id),
    inst.profile_id
      ? supabase
          .from("requirement_reviews")
          .select("decision")
          .eq("reviewer", inst.profile_id)
          .eq("reviewer_kind", "trainer")
      : Promise.resolve({ data: [] as { decision: string }[] }),
    supabase
      .from("activity_log")
      .select("id, action, created_at, detail")
      .eq("entity", "instructor")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const engagements = engRes.data ?? []
  const activeCount = engagements.filter((e) => e.status === "active").length
  const reviews = reviewRes.data ?? []
  const approved = reviews.filter((r) => r.decision === "approved").length
  const changesRequested = reviews.filter((r) => r.decision === "changes_requested").length

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/admin/instructors"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All instructors
      </Link>

      {/* Header + verify control */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{inst.name}</h1>
                {inst.verified ? (
                  <span className="inline-flex items-center gap-1 rounded bg-ok/12 px-1.5 py-0.5 text-[10px] text-ok">
                    <ShieldCheck className="size-3" /> verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-warn/12 px-1.5 py-0.5 text-[10px] text-warn">
                    <ShieldAlert className="size-3" /> pending
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {inst.email ?? "—"}
                {!inst.profile_id && <span className="ml-2 text-text-low">· no account yet</span>}
              </p>
            </div>
            <form action={setInstructorVerified}>
              <input type="hidden" name="id" value={inst.id} />
              <input type="hidden" name="verified" value={inst.verified ? "false" : "true"} />
              <Button type="submit" size="sm" variant={inst.verified ? "outline" : "default"}>
                {inst.verified ? "Un-verify" : "Verify"}
              </Button>
            </form>
          </div>

          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row k="DCJS credential" v={inst.dcjs_id ?? "—"} />
            <Row k="Trust tier" v={inst.trust_tier ?? "—"} />
            <Row k="Service area" v={`${boroughFromLatLng(inst.lat, inst.lng) ?? "—"} · ${inst.service_radius_mi} mi`} />
            <Row k="18-hr price" v={inst.price_18h_cents ? money(inst.price_18h_cents) : "—"} />
            <Row k="Jurisdictions" v={(inst.jurisdictions ?? []).join(", ") || "—"} />
            <Row
              k="Rating"
              v={inst.rating_count ? `${inst.rating_avg ?? "—"} (${inst.rating_count})` : "—"}
            />
            <Row k="Onboarded" v={inst.onboarding_completed_at ? formatDate(inst.onboarding_completed_at) : "No"} />
            <Row
              k="Payouts"
              v={inst.payouts_enabled ? "Enabled" : inst.stripe_connect_account_id ? "Connected (not enabled)" : "Not set up"}
            />
          </dl>
        </CardContent>
      </Card>

      {/* Public directory listing (opt-in, admin-controlled) */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold">Public directory listing</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            When enabled AND the instructor is verified, they appear on the public{" "}
            <Link href="/instructors" className="text-signal hover:underline">/instructors</Link>{" "}
            directory. Only name, chosen boroughs, languages, class format, and bio are shown publicly.
            {!inst.verified && " This instructor isn't verified yet, so they won't appear until they are."}
          </p>
          <form action={setInstructorPublicListing} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={inst.id} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="public_profile"
                value="true"
                defaultChecked={inst.public_profile}
                className="size-4 accent-brass"
              />
              List this instructor publicly
            </label>
            <div>
              <p className="text-xs text-text-low">Boroughs shown on the public card</p>
              <div className="mt-1.5 flex flex-wrap gap-3">
                {NYC_BOROUGHS.map((b) => (
                  <label key={b} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="borough"
                      value={b}
                      defaultChecked={(inst.public_boroughs ?? []).includes(b)}
                      className="size-4 accent-brass"
                    />
                    {b}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" size="sm">Save listing</Button>
          </form>
        </CardContent>
      </Card>

      {/* Performance */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Active engagements" value={String(activeCount)} />
        <Stat label="Items approved" value={String(approved)} />
        <Stat label="Changes requested" value={String(changesRequested)} />
        <Stat
          label="Rating"
          value={inst.rating_count ? `${inst.rating_avg ?? "—"}` : "—"}
          icon={<Star className="size-4 text-brass" />}
        />
      </div>

      {/* Engagements */}
      <Section title="Engagements">
        {engagements.length === 0 ? (
          <Empty>No engagements yet.</Empty>
        ) : (
          <ul className="space-y-2 text-sm">
            {engagements.map((e) => {
              const c = e.cases as unknown as { id: string; clients: { full_name: string } | null } | null
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                  <span>
                    {c?.id ? (
                      <Link href={`/admin/cases/${c.id}`} className="font-medium text-signal hover:underline">
                        {c?.clients?.full_name ?? "—"}
                      </Link>
                    ) : (
                      <span className="font-medium">{c?.clients?.full_name ?? "—"}</span>
                    )}
                    <span className="ml-2 text-xs text-text-low">{e.type} · since {formatDate(e.created_at)}</span>
                  </span>
                  <StatusBadge status={e.status} />
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {/* Bookings */}
      <Section title="Recent bookings">
        {(bookingRes.data ?? []).length === 0 ? (
          <Empty>No bookings.</Empty>
        ) : (
          <ul className="space-y-2 text-sm">
            {(bookingRes.data ?? []).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                <Link href={`/admin/cases/${b.case_id}`} className="capitalize text-signal hover:underline">
                  {b.type.replace(/_/g, " ")}
                </Link>
                <span className="flex items-center gap-3 text-xs text-text-mid">
                  {formatDateTime(b.starts_at)}
                  <StatusBadge status={b.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Training locations */}
      <Section title="Training locations">
        {(locRes.data ?? []).length === 0 ? (
          <Empty>No locations on file.</Empty>
        ) : (
          <ul className="space-y-2 text-sm">
            {(locRes.data ?? []).map((l) => (
              <li key={l.id} className="flex items-center gap-2">
                <MapPin className="size-4 text-signal" />
                <span className="font-medium">{l.label}</span>
                {l.is_range && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-mid">range</span>}
                {l.address && <span className="text-text-low">· {l.address}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Activity */}
      <Section title="Activity">
        {(activityRes.data ?? []).length === 0 ? (
          <Empty>No activity recorded.</Empty>
        ) : (
          <ul className="space-y-1 text-sm">
            {(activityRes.data ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-text-mid">
                <span className="font-mono text-xs">{a.action}</span>
                <span className="text-xs text-text-low">{formatDateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-hairline/50 py-1">
      <dt className="text-text-low">{k}</dt>
      <dd className="text-right capitalize">{v}</dd>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="engraved mb-2 text-text-low">{title}</h2>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed bg-card p-4 text-sm text-text-mid">{children}</p>
}
