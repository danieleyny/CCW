import { Trash2, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyInstructor, getMyTrainingLocations } from "@/lib/instructor"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { addSlot, removeSlot } from "./actions"

export const metadata = { title: "Availability" }

const SLOT_TYPES = [
  { value: "combined_18h", label: "18-hour course (classroom + range)" },
  { value: "classroom_16h", label: "16-hour classroom" },
  { value: "live_fire_2h", label: "2-hour live-fire range" },
  { value: "consult", label: "Consultation" },
]

export default async function AvailabilityPage() {
  const me = await getMyInstructor()
  if (!me) return <p className="text-sm text-text-mid">Profile not found.</p>
  const [locations, supabase] = [await getMyTrainingLocations(me.id), await createClient()]
  const { data: slots } = await supabase
    .from("availability_slots")
    .select("id, type, starts_at, ends_at, capacity, booked_count, location_id")
    .eq("instructor_id", me.id)
    .order("starts_at", { ascending: true })

  const locName = new Map(locations.map((l) => [l.id, l.label]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish open sessions. Clients book them; you confirm to send calendar invites.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Published slots</h2>
          {(slots ?? []).length === 0 ? (
            <p className="text-sm text-text-mid">No slots yet.</p>
          ) : (
            <ul className="space-y-2">
              {(slots ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Calendar className="size-4 text-signal" />
                    <span>{new Date(s.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <span className="text-text-low">· {SLOT_TYPES.find((t) => t.value === s.type)?.label ?? s.type}</span>
                    {s.location_id && <span className="text-text-low">· {locName.get(s.location_id)}</span>}
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-mid">{s.booked_count}/{s.capacity} booked</span>
                  </span>
                  <form action={removeSlot}>
                    <input type="hidden" name="slotId" value={s.id} />
                    <Button type="submit" variant="ghost" size="icon" disabled={s.booked_count > 0}>
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Add a slot</h2>
          <form action={addSlot} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs">Type</Label>
                <select id="type" name="type" defaultValue="combined_18h" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {SLOT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="locationId" className="text-xs">Location</Label>
                <select id="locationId" name="locationId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">— none —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startsAt" className="text-xs">Starts</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endsAt" className="text-xs">Ends</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="capacity" className="text-xs">Capacity</Label>
                <Input id="capacity" name="capacity" type="number" min={1} defaultValue={1} />
              </div>
            </div>
            <Button type="submit" size="sm">Publish slot</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
