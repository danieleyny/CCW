/**
 * PART C / Phase 11 — message catalogs.
 *
 * `en` is the source of truth and the key set. Every other locale is a partial
 * overlay: a missing key falls back to English (see lib/i18n/index.ts), so a
 * half-translated locale degrades gracefully instead of showing blanks.
 *
 * ⚖ Keys under `legal` are DELIBERATELY English-only in every non-English
 * catalog until an attorney fluent in that language reviews a translation.
 * `LEGAL_KEYS` lists them so a test can prove no locale ever silently overrides
 * one with an un-reviewed string.
 */
import type { Locale } from "@/config/i18n"

export interface Messages {
  portal: {
    tagline: string
    yourData: string
    nextStepEyebrow: string
    finishIntake: string
    continueIntake: string
    viewEverything: string
  }
  common: {
    signOut: string
    language: string
  }
  legal: {
    // ⚖ Reviewed English. Do NOT translate without attorney/native sign-off.
    filesOwnApplication: string
  }
}

/** Keys that must never be translated without attorney/native review. */
export const LEGAL_KEYS = ["legal.filesOwnApplication"] as const

const en: Messages = {
  portal: {
    tagline: "Tracking your NYC concealed carry application, end to end.",
    yourData: "Your data & privacy",
    nextStepEyebrow: "Your next step",
    finishIntake: "Finish your intake",
    continueIntake: "Continue intake",
    viewEverything: "View everything left to do",
  },
  common: {
    signOut: "Sign out",
    language: "Language",
  },
  legal: {
    filesOwnApplication:
      "You file your own application — we prepare and review, we never submit it for you or represent you before the NYPD.",
  },
}

// Spanish overlay. Non-legal strings only — `legal` is intentionally omitted so
// it falls back to the reviewed English until counsel signs off on a translation.
const es: Partial<Messages> = {
  portal: {
    tagline: "Seguimiento de su solicitud de porte oculto de NYC, de principio a fin.",
    yourData: "Sus datos y privacidad",
    nextStepEyebrow: "Su siguiente paso",
    finishIntake: "Complete su cuestionario",
    continueIntake: "Continuar el cuestionario",
    viewEverything: "Ver todo lo que falta por hacer",
  },
  common: {
    signOut: "Cerrar sesión",
    language: "Idioma",
  },
}

export const CATALOGS: Record<Locale, Partial<Messages>> = { en, es }

/** The English catalog is always complete — the fallback source. */
export const SOURCE: Messages = en
