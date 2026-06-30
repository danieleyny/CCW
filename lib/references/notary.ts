/**
 * Zero-cost notary recommendations near the reference's area. No paid Places API
 * — we hand back a map search scoped to their location plus known free/low-cost
 * options (NYC libraries, UPS, banks). "Approved" just means a licensed NY notary.
 */
export interface NotaryOption {
  label: string
  url: string
  note: string
}

export function notaryOptions(area: string): NotaryOption[] {
  const a = area?.trim() || "me"
  const q = (s: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s)}`
  return [
    { label: `Notaries near ${area?.trim() || "you"}`, url: q(`notary public near ${a}`), note: "A live map of notary publics in your area." },
    { label: "NYC Public Library — free notary", url: "https://www.nypl.org/about/notary-public-service", note: "Many NYC library branches offer free notary service." },
    { label: "The UPS Store", url: "https://www.theupsstore.com/tools/find-a-store", note: "Most locations have a notary on staff (small fee)." },
    { label: "Your bank or credit union", url: q(`bank notary near ${a}`), note: "Banks often notarize for free for account holders." },
  ]
}

/**
 * Remote Online Notarization — New York permits notarizing by live video, so the
 * whole thing can be done from home in minutes. These are public RON providers a
 * signer can use directly today (no integration / key required).
 */
export function ronOptions(): NotaryOption[] {
  return [
    { label: "BlueNotary", url: "https://bluenotary.us/", note: "Upload the PDF, verify ID, and notarize by video — often a few dollars." },
    { label: "Proof (formerly Notarize)", url: "https://www.proof.com/", note: "On-demand notaries by video, available 24/7." },
    { label: "OneNotary", url: "https://onenotary.us/", note: "Live online notarization, typically under $25 a document." },
  ]
}
