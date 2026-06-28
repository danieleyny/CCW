import { Trash2, MapPin } from "lucide-react"
import { getMyInstructor, getMyTrainingLocations } from "@/lib/instructor"
import { boroughFromLatLng, BOROUGHS } from "@/lib/geo/nyc"
import { addTrainingLocation, removeTrainingLocation } from "@/app/instructor/actions"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { InstructorProfileForm } from "@/components/instructor/profile-form"

export const metadata = { title: "Instructor profile" }

export default async function InstructorProfilePage() {
  const me = await getMyInstructor()
  if (!me) return <p className="text-sm text-text-mid">Profile not found.</p>
  const locations = await getMyTrainingLocations(me.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clients in your service area see this once an admin verifies you.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <InstructorProfileForm
            initial={{
              bio: me.bio ?? "",
              dcjsId: me.dcjs_id ?? "",
              borough: boroughFromLatLng(me.lat, me.lng) ?? "Manhattan",
              radiusMi: me.service_radius_mi,
              price18hDollars: me.price_18h_cents ? String(Math.round(me.price_18h_cents / 100)) : "",
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
