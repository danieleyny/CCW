/**
 * V5b Workstream D — NYC-first quick links. OFFICIAL sources only; every link
 * carries a lastVerified date. Reciprocity is a LINK-OUT to Concealed Knowledge
 * (they own the dataset); we do not rebuild the map here.
 */
export interface ResourceLink {
  label: string
  href: string
  note?: string
  lastVerified: string // YYYY-MM-DD
  external?: boolean
}
export interface ResourceGroup {
  title: string
  intro?: string
  links: ResourceLink[]
}

const V = "2026-07-14"

export const resourceGroups: ResourceGroup[] = [
  {
    title: "NYPD License Division",
    intro: "Where you submit and where the process is governed.",
    links: [
      {
        label: "NYPD pistol license overview",
        href: "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page",
        lastVerified: V,
        external: true,
      },
      {
        label: "Carry & premises license applications",
        href: "https://www.nyc.gov/site/nypd/services/law-enforcement/handgun-license.page",
        note: "You submit your own application — that is the law.",
        lastVerified: V,
        external: true,
      },
      {
        label: "38 RCNY Chapter 5 — handgun license rules",
        href: "https://www.nyc.gov/site/nypd/about/about-nypd/rules.page",
        lastVerified: V,
        external: true,
      },
    ],
  },
  {
    title: "Fees (paid directly to the government)",
    intro: "Neither is collected by Gun License NYC; neither is refundable.",
    links: [
      {
        label: "NYPD handgun license application fee — $340",
        href: "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page",
        lastVerified: V,
        external: true,
      },
      {
        label: "NYS DCJS fingerprint fee — $88.25",
        href: "https://www.criminaljustice.ny.gov/ojis/fingerprinting.htm",
        lastVerified: V,
        external: true,
      },
    ],
  },
  {
    title: "Training",
    intro: "18 hours total, and the certificate must be dated within 6 months of filing.",
    links: [
      {
        label: "NYS CCIA — 16-hour classroom + 2-hour live-fire requirement",
        href: "https://www.criminaljustice.ny.gov/",
        note: "With a DCJS-approved instructor; a written test passed at 80%+.",
        lastVerified: V,
        external: true,
      },
      {
        label: "NYS Division of Criminal Justice Services (DCJS)",
        href: "https://www.criminaljustice.ny.gov/",
        lastVerified: V,
        external: true,
      },
    ],
  },
  {
    title: "After you're licensed",
    links: [
      {
        label: "NYS firearms recertification",
        href: "https://firearms.troopers.ny.gov/",
        note: "Recertify on the state's schedule so your license doesn't lapse.",
        lastVerified: V,
        external: true,
      },
      {
        label: "Safe-storage rules — NY Penal Law §265.45",
        href: "https://www.nysenate.gov/legislation/laws/PEN/265.45",
        lastVerified: V,
        external: true,
      },
      {
        label: "Where your license is honored (reciprocity)",
        href: "https://concealedknowledge.com/reciprocity?home=ny",
        note: "Maintained by Concealed Knowledge.",
        lastVerified: V,
        external: true,
      },
    ],
  },
]
