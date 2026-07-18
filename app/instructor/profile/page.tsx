import { Trash2, MapPin, Check, Circle } from "lucide-react"
import { getMyInstructor, getMyTrainingLocations } from "@/lib/instructor"
import { boroughFromLatLng, BOROUGHS } from "@/lib/geo/nyc"
import { addTrainingLocation, removeTrainingLocation } from "@/app/instructor/actions"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { InstructorProfileForm } from "@/components/instructor/profile-form"
import { evaluateProfile } from "@/lib/instructors/profile"

export const metadata = { title: "Instructor profile" }

export default async function InstructorProfilePage() {
  const me = await getMyInstructor()
  if (!me) return <p className="text-sm text-text-mid">Profile not found.</p>
  const locations = await getMyTrainingLocations(me.id)

  // GO-LIVE: verified proves the credential; complete proves there's enough here
  // to choose from. Both are required before applicants see this instructor —
  // and the checklist says exactly what's missing and why an applicant cares.
  const completeness = evaluateProfile({ ...me, locations })
  const live = me.verified && completeness.complete

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clients in your service area see this once an admin verifies you.
        </p>
      </div>

      <Card className={live ? "border-ok/30" : "border-brass/30"}>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                {live ? "You're live — applicants can find you" : "Complete these to start getting matched"}
              </h2>
              <p className="mt-1 text-xs text-text-mid">
                {me.verified
                  ? "Your DCJS credential is verified."
                  : "An admin still needs to verify your DCJS credential — we'll check it before you go live."}
              </p>
            </div>
            <span className="font-mono text-sm tabular-nums text-text-mid">{completeness.percent}%</span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className={live ? "h-full rounded-full bg-ok" : "h-full rounded-full bg-brass"}
              style={{ width: `${completeness.percent}%` }}
            />
          </div>

          <ul className="space-y-1.5">
            {completeness.checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-xs">
                {c.done ? (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-ok" />
                ) : (
                  <Circle className="mt-0.5 size-3.5 shrink-0 text-text-low" />
                )}
                <span className={c.done ? "text-text-low line-through" : ""}>
                  <span className={c.done ? "" : "font-medium text-foreground"}>{c.label}</span>
                  {!c.done && <span className="block text-text-mid">{c.why}</span>}
                </span>
              </li>
            ))}
          </ul>

          {!live && (
            <p className="text-xs text-text-low">
              Until this is complete you won&apos;t appear in an applicant&apos;s feed or be able to
              send offers — including auto-offers.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <InstructorProfileForm
            initial={{
              bio: me.bio ?? "",
              phone: me.phone ?? "",
              dcjsId: me.dcjs_id ?? "",
              borough: boroughFromLatLng(me.lat, me.lng) ?? "Manhattan",
              radiusMi: me.service_radius_mi,
              price18hDollars: me.price_18h_cents ? String(Math.round(me.price_18h_cents / 100)) : "",
              websiteUrl: me.website_url ?? "",
              instagramHandle: me.instagram_handle ?? "",
              yearsExperience: me.years_experience != null ? String(me.years_experience) : "",
              background: me.background ?? "",
              languages: (me.languages ?? []).join(", "),
              classFormat: me.class_format ?? "",
              typicalClassSize: me.typical_class_size != null ? String(me.typical_class_size) : "",
              providesRange: me.provides_range === true ? "yes" : me.provides_range === false ? "no" : "",
              separateRangeNote: me.separate_range_note ?? "",
              rangeFeeIncluded: !!me.range_fee_included,
              ammoIncluded: !!me.ammo_included,
              materialsIncluded: !!me.materials_included,
              whatsToBring: me.whats_to_bring ?? "",
              schedulingNotes: me.scheduling_notes ?? "",
              responseTimeNote: me.response_time_note ?? "",
              offersIntroCall: !!me.offers_intro_call,
              introCallNote: me.intro_call_note ?? "",
              autoOfferEnabled: !!me.auto_offer_enabled,
              autoOfferNote: me.auto_offer_note ?? "",
              autoOfferPriceDollars: me.auto_offer_price_cents
                ? String(Math.round(me.auto_offer_price_cents / 100))
                : "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Training locations</h2>
          {locations.length > 0 && (
            <ul className="mb-4 space-y-2">
              {locations.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 rounded-md border border-hairline px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <MapPin className="size-4 text-signal" />
                    <span className="font-medium">{l.label}</span>
                    {l.is_range && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-mid">range</span>}
                    {l.address && <span className="text-text-low">· {l.address}</span>}
                  </span>
                  <form action={removeTrainingLocation}>
                    <input type="hidden" name="locationId" value={l.id} />
                    <Button type="submit" variant="ghost" size="icon">
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={addTrainingLocation} className="space-y-3 rounded-md border border-hairline p-3">
            <div className="engraved text-text-low">Add a location</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="label" className="text-xs">Label</Label>
                <Input id="label" name="label" placeholder="Westside Range" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loc-borough" className="text-xs">Borough</Label>
                <select id="loc-borough" name="borough" defaultValue="Manhattan" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {BOROUGHS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs">Address</Label>
              <Input id="address" name="address" placeholder="123 W 30th St, New York, NY" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isRange" className="size-4" /> Live-fire range capable
            </label>
            <Button type="submit" size="sm">Add location</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
