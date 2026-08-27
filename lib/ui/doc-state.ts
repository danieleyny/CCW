/**
 * THE ONE document-state vocabulary + palette. Every surface that shows where a
 * document stands — the concierge vault/uploader, the sponsor page, /portal/
 * documents, and the self-guided checklist — maps its own internal status to ONE
 * of these `DocState`s and reads the visual treatment from here. Inline per-surface
 * classNames are exactly how the four states drifted into looking like one.
 *
 * THE RULE: brass means "your turn," and nothing else uses brass. The states are
 * separated by MASS, not hue alone, so they hold up in greyscale and for
 * colour-blind viewers:
 *   FILLED   solid colour, dark text punched out.  High mass — a demand.
 *   OUTLINE  thin ring, transparent centre.        Low mass — a label.
 *   GHOST    text + icon only.                     No mass — a footnote.
 *
 *   needs_you   3px solid brass  · surface-2 (lifted)  · FILLED brass    · title medium
 *   changes     3px solid warn   · surface-2 (lifted)  · FILLED warn     · title medium
 *   received    2px solid signal · surface-1 (flat)    · OUTLINE signal  · title normal
 *   approved    2px solid ok     · surface-1 (flattest)· GHOST ok        · desc hidden
 *   waiting     1px dashed       · surface-1           · GHOST muted     · names the person
 *
 * Green (ok) means STAFF ACCEPTANCE and nothing else. "received" (a server-
 * confirmed upload we haven't accepted yet) is signal, never green, never brass.
 */
import { CheckCircle2, Clock, AlertTriangle, Upload, Users, type LucideIcon } from "lucide-react"

export type DocState = "needs_you" | "changes" | "received" | "approved" | "waiting"

export type ChipVariant = "filled" | "outline" | "ghost"
export type DocTone = "brass" | "warn" | "signal" | "ok" | "muted"

export interface DocStateStyle {
  /** Left-rail border classes (weight + colour). */
  rail: string
  /** Card background + border. */
  surface: string
  chipVariant: ChipVariant
  tone: DocTone
  icon: LucideIcon
  label: string
  /** The title recedes (approved/waiting) — normal weight, muted. */
  quiet: boolean
}

const STYLES: Record<DocState, DocStateStyle> = {
  needs_you: {
    rail: "border-l-[3px] border-l-brass",
    surface: "border border-hairline-strong bg-surface-2",
    chipVariant: "filled",
    tone: "brass",
    icon: Upload,
    label: "Needs you",
    quiet: false,
  },
  changes: {
    rail: "border-l-[3px] border-l-warn",
    surface: "border border-warn/40 bg-surface-2",
    chipVariant: "filled",
    tone: "warn",
    icon: AlertTriangle,
    label: "Changes requested",
    quiet: false,
  },
  received: {
    rail: "border-l-2 border-l-signal",
    surface: "border border-hairline bg-surface-1",
    chipVariant: "outline",
    tone: "signal",
    icon: Clock,
    label: "Received",
    quiet: false,
  },
  approved: {
    rail: "border-l-2 border-l-ok",
    surface: "border border-hairline bg-surface-1",
    chipVariant: "ghost",
    tone: "ok",
    icon: CheckCircle2,
    label: "Approved",
    quiet: true,
  },
  waiting: {
    rail: "border-l border-l-transparent border-dashed",
    surface: "border border-dashed border-hairline bg-surface-1",
    chipVariant: "ghost",
    tone: "muted",
    icon: Users,
    label: "Waiting",
    quiet: true,
  },
}

export function docStateStyle(state: DocState): DocStateStyle {
  return STYLES[state]
}

/** Tailwind fragments per (variant × tone). The chip is where mass separates the
 *  states; keep these literal so Tailwind's scanner keeps the classes. */
export function chipClasses(variant: ChipVariant, tone: DocTone): string {
  if (variant === "filled") {
    // Solid colour, dark text punched out — a demand. Only brass/warn ever fill.
    return tone === "warn"
      ? "rounded bg-warn px-1.5 py-0.5 font-medium text-surface-1"
      : "rounded bg-brass px-1.5 py-0.5 font-medium text-surface-1"
  }
  if (variant === "outline") {
    // Thin ring, transparent centre — a label. Signal only.
    return "rounded border border-signal px-1.5 py-0.5 text-signal"
  }
  // ghost — text + icon only. ok / muted.
  return tone === "ok" ? "text-ok" : "text-text-mid"
}
