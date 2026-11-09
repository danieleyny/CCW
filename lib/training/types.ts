import { z } from "zod"

export const SESSION_SCHEMA = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  label: z.string().min(1).max(80),
})
export type TrainingSession = z.infer<typeof SESSION_SCHEMA>

export const PUBLIC_CLASS_SCHEMA = z.object({
  id: z.string().uuid(), slug: z.string(), title: z.string(), sessions: z.array(SESSION_SCHEMA),
  locationPublic: z.string(), hoursCopy: z.string(), priceCents: z.number().int().nonnegative(),
  capacity: z.number().int().positive().nullable(), seatsLeft: z.number().int().nullable(),
  status: z.enum(["open", "almost_full", "sold_out", "closed"]), nextAfter: z.string().nullable(),
  instructorName: z.string().nullable(), checkoutAvailable: z.boolean(), previewCheckout: z.boolean().optional(),
})
export type PublicTrainingClass = z.infer<typeof PUBLIC_CLASS_SCHEMA>

const personName = z.string().trim().min(1).max(80).regex(/^[A-Za-zÀ-ÿ .'-]+$/, "Use letters, spaces, apostrophes, or hyphens.")
export const TRAINING_REGISTRATION_SCHEMA = z.object({
  classId: z.string().uuid(), registrationId: z.string().uuid().optional(),
  firstName: personName, middleName: z.string().trim().max(80).optional().default(""), lastName: personName,
  dob: z.string().date(), gender: z.enum(["male", "female", "na"]),
  email: z.string().trim().email().max(254), mobilePhone: z.string().trim().min(7).max(30),
  homePhone: z.string().trim().max(30).optional().default(""), address1: z.string().trim().min(2).max(160),
  address2: z.string().trim().max(160).optional().default(""), city: z.string().trim().min(2).max(80),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()), zip: z.string().trim().regex(/^\d{5}$/),
  usCitizen: z.enum(["yes", "legal_resident", "no"]), experience: z.enum(["none", "beginner", "intermediate", "advanced"]),
  background: z.enum(["civilian", "military", "former_military", "law_enforcement", "former_law_enforcement", "instructor", "first_responder", "gov_contractor"]),
  emergencyName: personName, emergencyPhone: z.string().trim().min(7).max(30),
  medicalNotes: z.string().trim().max(2000).optional().default(""), fileKey: z.string().min(1).max(500),
  smsOptIn: z.boolean(), agreedAttendance: z.literal(true), agreedTerms: z.literal(true),
  utm: z.record(z.string(), z.string()).optional().default({}),
})
export type TrainingRegistrationInput = z.infer<typeof TRAINING_REGISTRATION_SCHEMA>

export function ageOn(dateOfBirth: string, now = new Date()): number {
  const birth = new Date(`${dateOfBirth}T00:00:00`)
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const month = now.getUTCMonth() - birth.getUTCMonth()
  if (month < 0 || (month === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1
  return age
}
