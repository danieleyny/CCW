/**
 * CARRY brand configuration — THE single source of truth for brand identity and
 * the full color system. Aesthetic: dark-first "obsidian / brass / signal-cyan"
 * — luxury personal-protection concierge meets precision instrument / HUD.
 *
 * Colors are injected as CSS variables by <BrandStyle /> (config/brand-style.tsx)
 * and consumed via semantic Tailwind tokens (bg-card, text-foreground) plus the
 * brand utilities (bg-brass, text-signal, border-hairline, bg-surface-2, …).
 * Components must never hardcode colors — rebrand by editing this file only.
 */

export const brand = {
  name: "CARRY",
  legalName: "CARRY Holdings LLC",
  tagline: "Concealed carry, handled with precision.",
  description:
    "CARRY is a private licensing concierge that guides New Yorkers through the full NYC concealed-carry-weapon process — training, documents, and filing — from first inquiry to licensed.",
  domain: "carry.example",
  url: "https://carry.example",
  contact: {
    email: "concierge@carry.example",
    phone: "(212) 555-0142",
    address: "New York, NY",
  },
  logo: {
    // Reticle glyph as the mark; wordmark in the display typeface.
    wordmark: "CARRY",
    mark: "◎",
  },
  // V3-P0.7 — the standing legal disclaimer. NYPD's published position: consulting
  // firms cannot represent applicants, cannot expedite, and are not endorsed; only
  // a NY-licensed attorney may represent an applicant before the License Division.
  disclaimer:
    "CARRY is a private document-preparation and case-management service. We are not attorneys and do not represent you before the NYPD License Division. We cannot expedite or guarantee any outcome, and we are not affiliated with or endorsed by the NYPD or any government agency. You review and submit your own application, and the NYPD retains full investigative discretion.",
  fonts: {
    display: "var(--font-display)",
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
  },
} as const

/**
 * Raw palette — exposed both as Tailwind utilities (via globals @theme) and as
 * the source for the shadcn semantic tokens below.
 */
export const palette = {
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

const INK = "#0B0A07" // near-black ink for text on brass

/** shadcn/Radix semantic tokens mapped onto the obsidian system. */
const shadcn: Record<string, string> = {
  background: palette.bg,
  foreground: palette["text-hi"],
  card: palette["surface-1"],
  "card-foreground": palette["text-hi"],
  popover: palette["surface-2"],
  "popover-foreground": palette["text-hi"],
  primary: palette.brass,
  "primary-foreground": INK,
  secondary: palette["surface-2"],
  "secondary-foreground": palette["text-hi"],
  muted: palette["surface-2"],
  "muted-foreground": palette["text-mid"],
  accent: palette["surface-3"],
  "accent-foreground": palette["text-hi"],
  brand: palette.brass,
  "brand-foreground": INK,
  destructive: palette.danger,
  border: palette.hairline,
  input: palette["hairline-strong"],
  ring: palette.signal,
  "chart-1": palette.brass,
  "chart-2": palette.signal,
  "chart-3": palette["brass-bright"],
  "chart-4": palette["text-low"],
  "chart-5": palette["brass-deep"],
  sidebar: "#0A0C10",
  "sidebar-foreground": palette["text-mid"],
  "sidebar-primary": palette.brass,
  "sidebar-primary-foreground": INK,
  "sidebar-accent": palette["surface-2"],
  "sidebar-accent-foreground": palette["text-hi"],
  "sidebar-border": palette.hairline,
  "sidebar-ring": palette.signal,
}

/** CSS the root layout injects so brand.ts drives the live (dark-only) theme. */
export function brandCss(): string {
  const all = { ...palette, ...shadcn }
  const body = Object.entries(all)
    .map(([k, v]) => `--${k}:${v};`)
    .join("")
  return `:root{${body}}`
}

export type Brand = typeof brand
