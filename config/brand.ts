/**
 * Gun License NYC brand configuration — THE single source of truth for brand identity and
 * the full color system. Aesthetic: dark-first "obsidian / brass / signal-cyan"
 * — luxury personal-protection concierge meets precision instrument / HUD.
 *
 * Colors are injected as CSS variables by <BrandStyle /> (config/brand-style.tsx)
 * and consumed via semantic Tailwind tokens (bg-card, text-foreground) plus the
 * brand utilities (bg-brass, text-signal, border-hairline, bg-surface-2, …).
 * Components must never hardcode colors — rebrand by editing this file only.
 */

export const brand = {
  name: "Gun License NYC",
  // NOTE: default entity name — replace with the real registered LLC if different.
  legalName: "Gun License NYC",
  tagline: "Concealed carry, handled with precision.",
  description:
    "Gun License NYC is a private licensing concierge that guides New Yorkers through the full NYC concealed-carry-weapon process — training, documents, and filing — from first inquiry to licensed.",
  domain: "gunlicensenyc.com",
  url: "https://gunlicensenyc.com",
  contact: {
    email: "gunlicensenyc@gmail.com",
    phone: "(929) 352-5961",
    address: "New York, NY",
  },
  logo: {
    // SVG mark lives in components/brand/logo.tsx; wordmark in the display typeface.
    wordmark: "Gun License NYC",
    mark: "◎",
  },
  // V3-P0.7 — the standing legal disclaimer. NYPD's published position: consulting
  // firms cannot represent applicants, cannot expedite, and are not endorsed; only
  // a NY-licensed attorney may represent an applicant before the License Division.
  disclaimer:
    "Gun License NYC is a private document-preparation and case-management service. We are not attorneys and do not represent you before the NYPD License Division. We cannot expedite or guarantee any outcome, and we are not affiliated with or endorsed by the NYPD or any government agency. You review and submit your own application, and the NYPD retains full investigative discretion.",
  fonts: {
    display: "var(--font-display)",
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
  },
} as const

/**
 * Raw palettes — exposed as Tailwind utilities (via globals @theme) and as the
 * source for the shadcn semantic tokens below. Two themes:
 *   • paletteDark  — the obsidian/brass/signal instrument (the app: portal,
 *     admin, instructor). This is the original Gun License NYC register, unchanged.
 *   • paletteLight — warm paper / brass / ink "my lawyer's office" (marketing).
 * Continuity across the two is TYPE, RADIUS, and BRASS — not the background.
 */
export const paletteDark = {
  // Near-true-black with a faint cool blue-violet undertone — reads colder and
  // more "futuristic" than a neutral charcoal while staying obsidian-dark.
  bg: "#07080B",
  // Surfaces re-derived as subtle cool-grey steps (a hint of blue) so stacked
  // panels read as layered glass rather than flat boxes.
  "surface-1": "#0E1015",
  "surface-2": "#14171D",
  "surface-3": "#1C2027",
  hairline: "rgba(255,255,255,0.08)",
  "hairline-strong": "rgba(255,255,255,0.14)",
  "text-hi": "#F2F3F5",
  "text-mid": "#A8AEB8",
  "text-low": "#6B7280",
  brass: "#C9A24B",
  "brass-bright": "#E7C77A",
  "brass-deep": "#8E6F2E",
  // Slightly richer brass glow so the prestige edge reads on dark glass.
  "brass-glow": "rgba(201,162,75,0.28)",
  // Cool premium counterweight to brass — a restrained platinum/ice highlight.
  // This temperature contrast is what makes the palette read as futuristic-luxury.
  ice: "#BFD8E6",
  "ice-dim": "rgba(191,216,230,0.14)",
  signal: "#5FD0E0",
  "signal-dim": "rgba(95,208,224,0.16)",
  ok: "#4ADE80",
  warn: "#F2B45A",
  danger: "#F2555A",
} as const

/**
 * Warm-paper light theme (marketing). Bone-white paper, ink text, and a DEEPER
 * brass for text/borders so it stays AA-legible on light; the fill brass matches
 * the dark theme so the mark reads the same. Cool accents darkened for contrast.
 */
export const paletteLight = {
  bg: "#FAF9F7",
  "surface-1": "#FFFFFF",
  "surface-2": "#F4F2EE",
  "surface-3": "#EAE7E1",
  hairline: "rgba(20,18,14,0.08)",
  "hairline-strong": "rgba(20,18,14,0.14)",
  "text-hi": "#14120E",
  "text-mid": "#57534E",
  "text-low": "#8A8580",
  // Fill brass matches dark; "bright"/"deep" go DARKER (readable ink-brass on paper).
  brass: "#C9A24B",
  "brass-bright": "#8E6F2E",
  "brass-deep": "#6E5423",
  "brass-glow": "rgba(142,111,46,0.20)",
  ice: "#5B7A88",
  "ice-dim": "rgba(91,122,136,0.12)",
  signal: "#0E7490",
  "signal-dim": "rgba(14,116,144,0.10)",
  ok: "#15803D",
  warn: "#B45309",
  danger: "#B91C1C",
} as const

/** Back-compat alias — nothing imports the raw palette today, but keep it. */
export const palette = paletteDark

const INK = "#0B0A07" // near-black ink for text on brass (both themes)

type Palette = Record<keyof typeof paletteDark, string>

/** shadcn/Radix semantic tokens derived from a palette. */
function shadcnFor(pal: Palette, sidebarBg: string): Record<string, string> {
  return {
    background: pal.bg,
    foreground: pal["text-hi"],
    card: pal["surface-1"],
    "card-foreground": pal["text-hi"],
    popover: pal["surface-2"],
    "popover-foreground": pal["text-hi"],
    primary: pal.brass,
    "primary-foreground": INK,
    secondary: pal["surface-2"],
    "secondary-foreground": pal["text-hi"],
    muted: pal["surface-2"],
    "muted-foreground": pal["text-mid"],
    accent: pal["surface-3"],
    "accent-foreground": pal["text-hi"],
    brand: pal.brass,
    "brand-foreground": INK,
    destructive: pal.danger,
    border: pal.hairline,
    input: pal["hairline-strong"],
    ring: pal.signal,
    "chart-1": pal.brass,
    "chart-2": pal.signal,
    "chart-3": pal["brass-bright"],
    "chart-4": pal["text-low"],
    "chart-5": pal["brass-deep"],
    sidebar: sidebarBg,
    "sidebar-foreground": pal["text-mid"],
    "sidebar-primary": pal.brass,
    "sidebar-primary-foreground": INK,
    "sidebar-accent": pal["surface-2"],
    "sidebar-accent-foreground": pal["text-hi"],
    "sidebar-border": pal.hairline,
    "sidebar-ring": pal.signal,
  }
}

const varsFrom = (obj: Record<string, string>) =>
  Object.entries(obj)
    .map(([k, v]) => `--${k}:${v};`)
    .join("")

/**
 * CSS the root layout injects. Light tokens on :root (marketing default), dark
 * tokens on `.dark` (the app route groups wrap their tree in it). CSS custom
 * properties cascade, so a `.dark` wrapper re-themes its whole subtree with no
 * runtime toggle and no flash.
 */
export function brandCss(): string {
  const light = varsFrom({ ...paletteLight, ...shadcnFor(paletteLight, paletteLight["surface-1"]) })
  const dark = varsFrom({ ...paletteDark, ...shadcnFor(paletteDark, "#0A0C10") })
  // `--app-bg-dark` is published on :root (not just .dark) so the DOCUMENT can be
  // painted obsidian on app routes — otherwise overscroll/short pages reveal the
  // light marketing paper behind the app shell. See globals.css `html:has(.dark)`.
  return `:root{${light}--app-bg-dark:${paletteDark.bg};} .dark{${dark}}`
}

export type Brand = typeof brand

/**
 * External costs that are NOT paid to us and NOT in the DB — the applicant pays
 * these directly to third parties (a DCJS instructor, a notary). Shown as
 * labeled RANGES because providers set their own prices; surfaced in the home
 * CostCard's all-in estimate. Government fees still come from getFees() (the
 * `fees` table). We never collect or mark these up. Typical NYC ranges, 2026.
 */
export const externalCostEstimates = {
  training: {
    label: "18-hour firearms course",
    note: "Paid to your state-certified instructor",
    lowCents: 50000,
    highCents: 65000,
  },
  notary: {
    label: "Notarization",
    note: "References + affidavits · online, ~10 min each",
    lowCents: 2500,
    highCents: 10000,
  },
  sourceNote:
    "Training and notary costs vary by provider, so we show ranges. Only the concierge fee is paid to us — the rest you pay directly, and we never mark it up.",
} as const

export type ExternalCostEstimates = typeof externalCostEstimates
