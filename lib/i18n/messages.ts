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
  concierge: {
    fullConcierge: string
    welcome: string
    introCall: string
    join: string
    documentsIn: string
    detailsCaptured: string
    workInProgress: string
    step: string
    of: string
    nextStep: string
    bookIntroTitle: string
    bookIntroDescription: string
    chooseTime: string
    modalTitle: string
    modalDescription: string
    scheduledToast: string
    frameTitle: string
    trouble: string
    openNewTab: string
    request: string
    sending: string
    requestReceived: string
    book: string
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
  concierge: {
    fullConcierge: "Full Concierge",
    welcome: "Welcome",
    introCall: "Intro call",
    join: "Join",
    documentsIn: "Documents in",
    detailsCaptured: "Details captured",
    workInProgress: "What we're doing for you",
    step: "Step",
    of: "of",
    nextStep: "Your next step",
    bookIntroTitle: "Book your 30-minute intro call",
    bookIntroDescription: "Nothing to prepare — we'll walk through your case and answer anything.",
    chooseTime: "Request my intro call",
    modalTitle: "Book your intro call",
    modalDescription: "Pick a time for your 30-minute concierge intro call.",
    scheduledToast: "Your intro call is booked — we'll confirm the details shortly.",
    frameTitle: "Schedule your concierge intro call",
    trouble: "Having trouble?",
    openNewTab: "Open in a new tab",
    request: "Request my intro call",
    sending: "Sending…",
    requestReceived: "Request received — we'll reach out to lock in a time.",
    book: "Book",
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
  concierge: {
    fullConcierge: "Servicio de conserjería",
    welcome: "Hola",
    introCall: "Llamada inicial",
    join: "Entrar",
    documentsIn: "Documentos listos",
    detailsCaptured: "Datos guardados",
    workInProgress: "Lo que hacemos por usted",
    step: "Paso",
    of: "de",
    nextStep: "Su siguiente paso",
    bookIntroTitle: "Reserve su llamada inicial de 30 minutos",
    bookIntroDescription: "No necesita preparar nada — revisaremos su caso y responderemos sus preguntas.",
    chooseTime: "Solicitar mi llamada inicial",
    modalTitle: "Reserve su llamada inicial",
    modalDescription: "Elija una fecha y hora para su llamada inicial de 30 minutos.",
    scheduledToast: "Su llamada inicial está reservada — confirmaremos los detalles en breve.",
    frameTitle: "Programe su llamada inicial",
    trouble: "¿Tiene problemas?",
    openNewTab: "Abrir en otra pestaña",
    request: "Solicitar mi llamada inicial",
    sending: "Enviando…",
    requestReceived: "Solicitud recibida — nos comunicaremos para confirmar una hora.",
    book: "Reservar",
  },
}

export const CATALOGS: Record<Locale, Partial<Messages>> = { en, es }

/** The English catalog is always complete — the fallback source. */
export const SOURCE: Messages = en
