"use client"

import { useActionState } from "react"
import { updateInstructorProfile } from "@/app/instructor/actions"
import { BOROUGHS } from "@/lib/geo/nyc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-hairline p-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {hint && <p className="mt-1 text-xs text-text-mid">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      {hint && <p className="text-xs text-text-low">{hint}</p>}
      {children}
    </div>
  )
}

function Check({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-[44px] items-start gap-2 py-1 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-4 shrink-0" />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-xs text-text-low">{hint}</span>}
      </span>
    </label>
  )
}

export function InstructorProfileForm({
  initial,
}: {
  initial: {
    bio: string
    phone: string
    dcjsId: string
    borough: string
    radiusMi: number
    price18hDollars: string
    websiteUrl: string
    instagramHandle: string
    yearsExperience: string
    background: string
    languages: string
    classFormat: string
    typicalClassSize: string
    providesRange: string
    separateRangeNote: string
    rangeFeeIncluded: boolean
    ammoIncluded: boolean
    materialsIncluded: boolean
    whatsToBring: string
    schedulingNotes: string
    responseTimeNote: string
    offersIntroCall: boolean
    introCallNote: string
    autoOfferEnabled: boolean
    autoOfferNote: string
    autoOfferPriceDollars: string
  }
}) {
  const [state, action, pending] = useActionState(updateInstructorProfile, {})
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="bio" className="text-xs">Bio <span className="text-text-low">(applicants read this when choosing)</span></Label>
        <Textarea id="bio" name="bio" rows={3} defaultValue={initial.bio} placeholder="Your experience, specialties, range affiliations…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={initial.phone} placeholder="(555) 123-4567" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dcjsId" className="text-xs">DCJS Duly-Authorized-Instructor ID</Label>
          <Input id="dcjsId" name="dcjsId" defaultValue={initial.dcjsId} placeholder="DAI-…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="borough" className="text-xs">Service-area center (borough)</Label>
          <select
            id="borough"
            name="borough"
            defaultValue={initial.borough || "Manhattan"}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {BOROUGHS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="radiusMi" className="text-xs">Service radius (miles)</Label>
          <Input id="radiusMi" name="radiusMi" type="number" min={1} max={100} defaultValue={initial.radiusMi} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price18hDollars" className="text-xs">18-hr course price (USD)</Label>
          <Input id="price18hDollars" name="price18hDollars" type="number" min={0} step="1" defaultValue={initial.price18hDollars} placeholder="e.g. 650" />
        </div>
      </div>

      <Section title="About you" hint="This is what an applicant reads when deciding who teaches them.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="yearsExperience" label="Years teaching">
            <Input id="yearsExperience" name="yearsExperience" type="number" min={0} max={70} defaultValue={initial.yearsExperience} placeholder="e.g. 12" />
          </Field>
          <Field id="languages" label="Languages you teach in" hint="Comma-separated — this decides it for a lot of New Yorkers.">
            <Input id="languages" name="languages" defaultValue={initial.languages} placeholder="English, Spanish" />
          </Field>
        </div>
        <Field id="background" label="Background" hint="Factual credentials — e.g. “Former NYPD firearms instructor, NRA-certified”.">
          <Textarea id="background" name="background" rows={2} defaultValue={initial.background} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="websiteUrl" label="Website" hint="No need to type https:// — “daniel.com” works.">
            <Input id="websiteUrl" name="websiteUrl" type="text" inputMode="url" defaultValue={initial.websiteUrl} placeholder="yoursite.com" />
          </Field>
          <Field id="instagramHandle" label="Instagram">
            <Input id="instagramHandle" name="instagramHandle" defaultValue={initial.instagramHandle} placeholder="@yourhandle" />
          </Field>
        </div>
      </Section>

      <Section
        title="Your course"
        hint="The 18-hour course is in person by law (16 classroom hours + 2 hours live fire) — so this is about the real-world logistics."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="classFormat" label="Class format">
            <select id="classFormat" name="classFormat" defaultValue={initial.classFormat} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select…</option>
              <option value="private_1on1">Private, one-on-one</option>
              <option value="small_group">Small group</option>
              <option value="both">Either — depends what they want</option>
            </select>
          </Field>
          <Field id="typicalClassSize" label="Typical class size">
            <Input id="typicalClassSize" name="typicalClassSize" type="number" min={1} max={60} defaultValue={initial.typicalClassSize} placeholder="e.g. 6" />
          </Field>
        </div>

        <Field id="providesRange" label="Do you provide the live-fire range?" hint="The range fee is the most common surprise cost — say so either way.">
          <select id="providesRange" name="providesRange" defaultValue={initial.providesRange} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select…</option>
            <option value="yes">Yes — the range is arranged by me</option>
            <option value="no">No — the applicant goes to a separate range</option>
          </select>
        </Field>
        <Field id="separateRangeNote" label="Which range would they use?" hint="Only needed if you don't provide the range.">
          <Input id="separateRangeNote" name="separateRangeNote" defaultValue={initial.separateRangeNote} placeholder="e.g. Westside Range, Manhattan — range fee paid on the day" />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-xs text-text-mid">What&apos;s included in your price</legend>
          <Check name="rangeFeeIncluded" label="Range fee included" defaultChecked={initial.rangeFeeIncluded} />
          <Check name="ammoIncluded" label="Ammunition included" defaultChecked={initial.ammoIncluded} />
          <Check name="materialsIncluded" label="Course materials included" defaultChecked={initial.materialsIncluded} />
        </fieldset>

        <Field id="whatsToBring" label="What should they bring?">
          <Textarea id="whatsToBring" name="whatsToBring" rows={2} defaultValue={initial.whatsToBring} placeholder="Photo ID, eye and ear protection (I have loaners), a notebook…" />
        </Field>
      </Section>

      <Section title="Scheduling & first contact">
        <Field id="schedulingNotes" label="Typical availability" hint="How soon you can usually start.">
          <Textarea id="schedulingNotes" name="schedulingNotes" rows={2} defaultValue={initial.schedulingNotes} placeholder="Weeknights and Saturdays; usually within two weeks." />
        </Field>
        <Field id="responseTimeNote" label="How fast you reply">
          <Input id="responseTimeNote" name="responseTimeNote" defaultValue={initial.responseTimeNote} placeholder="Usually the same day" />
        </Field>
        <Check
          name="offersIntroCall"
          label="Offer a free intro call before they commit"
          defaultChecked={initial.offersIntroCall}
          hint="A short call or video chat to meet you. This is the ONLY thing that can happen remotely — the course itself is in person."
        />
        <Field id="introCallNote" label="Intro call note">
          <Input id="introCallNote" name="introCallNote" defaultValue={initial.introCallNote} placeholder="15 minutes, evenings — ask me anything before you book" />
        </Field>
      </Section>

      <Section
        title="Auto-offer"
        hint="Answer new requests in your area automatically, so a request posted at midnight isn't met with silence. You still only express interest — the applicant chooses."
      >
        <Check name="autoOfferEnabled" label="Automatically express interest in new requests in my area" defaultChecked={initial.autoOfferEnabled} />
        <Field id="autoOfferNote" label="Message sent with it">
          <Textarea id="autoOfferNote" name="autoOfferNote" rows={2} defaultValue={initial.autoOfferNote} placeholder="Happy to help — I teach in Brooklyn most weeknights and can usually start within two weeks." />
        </Field>
        <Field id="autoOfferPriceDollars" label="Price to quote (USD)" hint="Leave blank to use your standard 18-hour price.">
          <Input id="autoOfferPriceDollars" name="autoOfferPriceDollars" type="number" min={0} step="1" defaultValue={initial.autoOfferPriceDollars} />
        </Field>
      </Section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-ok">Saved.</p>}
      </div>
    </form>
  )
}
