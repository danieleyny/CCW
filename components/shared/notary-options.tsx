import { MapPin, ExternalLink, Stamp, Video } from "lucide-react"
import { notaryOptions, ronOptions } from "@/lib/references/notary"

/**
 * The two notary ROUTES New York accepts — sign in front of a notary in person, OR
 * notarize online by live video (RON). ONE shared panel so the reference flow, the
 * cohabitant affidavit flow, and the applicant's own notarized documents (REL-01,
 * AFF-01) all offer the same, area-scoped options — no fourth copy to drift.
 *
 * This is purely a set of PUBLIC links the signer uses directly; it is NOT the
 * integrated RON gate (lib/notarization/ron.ts), which stays OFF until counsel signs
 * off. Nothing here marks a document notarised.
 */
export function NotaryRoutes({ area, stepNumber }: { area: string; stepNumber?: string }) {
  const opts = notaryOptions(area)
  const ron = ronOptions()
  return (
    <>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          {stepNumber && (
            <span className="flex size-5 items-center justify-center rounded-full bg-brass text-[10px] font-bold text-brand-foreground">
              {stepNumber}
            </span>
          )}
          <Stamp className="size-4 text-brass" /> Take it to a notary — bring photo ID
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign it <b>in front of the notary</b>, who then completes and stamps the certificate. Notary options near you:
        </p>
        <ul className="mt-2 space-y-1.5">
          {opts.map((o) => (
            <li key={o.label} className="text-sm">
              <a href={o.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal underline">
                <MapPin className="size-3.5" /> {o.label} <ExternalLink className="size-3" />
              </a>
              <span className="ml-1 text-xs text-text-low">— {o.note}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-signal/30 bg-signal/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Video className="size-4 text-signal" /> Prefer not to travel? Notarize online instead
        </div>
        <p className="mt-1 text-xs text-text-low">
          New York allows Remote Online Notarization — you sign by live video while the notary watches, in minutes.
          Upload the same unsigned PDF to any of these:
        </p>
        <ul className="mt-2 space-y-1.5">
          {ron.map((o) => (
            <li key={o.label} className="text-sm">
              <a href={o.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal underline">
                {o.label} <ExternalLink className="size-3" />
              </a>
              <span className="ml-1 text-xs text-text-low">— {o.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
