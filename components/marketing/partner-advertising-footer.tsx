import type { Partner } from "@/config/partners"

/**
 * The attorney-advertising footer (Q1/Q2/Q13). Rendered LAST on every page of a
 * partner's section — his profile, both states of the consultation form, and under his
 * card in the directory — so it is the final thing a reader sees, as NY Rule 7.1
 * contemplates. Everything comes from config; nothing is hard-coded here.
 *
 * This is the ONLY public place his phone and email render as real tel:/mailto: links
 * (he asked for them displayed). Every other route to him still goes through the
 * consultation form. It sits ALONGSIDE the independence disclaimer and brand.disclaimer —
 * it replaces neither.
 */

/** "860-590-0138" → "(860) 590-0138"; anything else renders as given. */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "")
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw
}
const telHref = (raw: string) => `tel:+1${raw.replace(/\D/g, "")}`

export function PartnerAdvertisingFooter({ partner }: { partner: Partner }) {
  const { advertisingDisclaimer, firm, address, phone, cellPhone, email } = partner
  return (
    <footer className="mt-12 border-t border-hairline pt-6 text-text-low">
      <p className="text-sm text-text-mid">{advertisingDisclaimer}</p>
      <div className="mt-3 space-y-0.5 text-xs">
        <p className="font-medium text-text-mid">{firm}</p>
        <p>
          {address.street}, {address.city}, {address.state} {address.zip}
        </p>
        <p>
          Office{" "}
          <a href={telHref(phone)} className="hover:text-text-mid hover:underline">
            {formatPhone(phone)}
          </a>{" "}
          · Cell{" "}
          <a href={telHref(cellPhone)} className="hover:text-text-mid hover:underline">
            {formatPhone(cellPhone)}
          </a>{" "}
          ·{" "}
          <a href={`mailto:${email}`} className="hover:text-text-mid hover:underline">
            {email}
          </a>
        </p>
      </div>
    </footer>
  )
}
