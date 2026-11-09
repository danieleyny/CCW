/**
 * Independent training providers shown alongside attorney partners. These are kept in
 * a separate registry deliberately: a firearms instructor is not legal counsel and
 * must never inherit attorney-specific copy, intake, or advertising disclosures.
 *
 * Sources reviewed October 22, 2026:
 * - https://www.shootingclasses.com/50b/
 * - https://gunsafety.ny.gov/firearm-safety-training-standards
 *
 * `coming_soon` profiles remain behind the same soft preview gate as attorney pages.
 * Confirm the portrait, every credential, and any NRA publication claim in writing
 * before changing this profile to `public`.
 */

import type { PartnerVisibility } from "@/config/partners"

export interface TrainingPartnerCredential {
  label: string
  value: string
  href?: string
}

export interface TrainingPartnerService {
  title: string
  detail: string
}

export interface TrainingPartnerFaq {
  q: string
  a: string
}

export interface TrainingPartner {
  /** URL segment and vanity route: /{slug}. */
  slug: string
  visibility: PartnerVisibility
  name: string
  firm: string
  role: string
  headline: string
  bio: string[]
  photo: { src: string; alt: string }
  location: string
  phone: string
  email: string
  /** In-site class registration destination. Never send prospects to the vendor listing. */
  signupHref: string
  highlights: { figure: string; label: string }[]
  credentials: TrainingPartnerCredential[]
  services: TrainingPartnerService[]
  faqs: TrainingPartnerFaq[]
}

/** The presentation-ready class registration section on the redesigned site. */
export const TRAINING_SIGNUP_PATH = "/V2#training"

export const TRAINING_PARTNERS: TrainingPartner[] = [
  {
    slug: "yarivbenari",
    visibility: "coming_soon",
    name: "Yariv Ben-Ari",
    firm: "50B EDC Training & Consulting LLC",
    role: "Managing Member · Firearms Instructor",
    headline:
      "An independent firearms instructor offering New York concealed-carry, pistol and rifle training through 50B EDC Training & Consulting LLC.",
    bio: [
      "Yariv Ben-Ari is the Managing Member and a firearms instructor at 50B EDC Training & Consulting LLC. 50B’s public course listing includes New York concealed-carry classes, pistol and rifle courses, private instruction and group training.",
      "For New York concealed carry, the state standard includes at least 16 hours of in-person classroom instruction and 2 hours of live-fire training. Confirm the current course schedule, eligibility, range details and completion documentation directly with 50B before enrolling.",
    ],
    photo: { src: "/partners/yariv-ben-ari-profile.png", alt: "Yariv Ben-Ari" },
    location: "New York City",
    phone: "332-323-2571",
    email: "yariv@50b.pro",
    signupHref: TRAINING_SIGNUP_PATH,
    highlights: [
      { figure: "16+2", label: "NY classroom + live-fire standard" },
      { figure: "NYS", label: "CCW course listing" },
      { figure: "1:1", label: "Private instruction" },
      { figure: "Group", label: "Class options" },
    ],
    credentials: [
      { label: "Role", value: "Managing Member · Firearms Instructor" },
      { label: "Organization", value: "50B EDC Training & Consulting LLC", href: TRAINING_SIGNUP_PATH },
      { label: "Course registration", value: "NYS CCW licensing class", href: TRAINING_SIGNUP_PATH },
      { label: "Training standard", value: "16 hours in-person classroom + 2 hours live-fire", href: "https://gunsafety.ny.gov/firearm-safety-training-standards" },
      { label: "Service area", value: "New York City" },
    ],
    services: [
      { title: "NYS concealed-carry training", detail: "Discuss upcoming course dates, format and the completion documentation provided by 50B." },
      { title: "Private instruction", detail: "Ask about one-on-one instruction and whether it fits your experience and goals." },
      { title: "Group training", detail: "Ask about small-group options, availability and what participants should expect." },
      { title: "Pistol and rifle fundamentals", detail: "Explore the beginner and returning-shooter course options listed by 50B." },
    ],
    faqs: [
      {
        q: "Is the course only 16 hours?",
        a: "New York’s concealed-carry standard has two parts: at least 16 hours of in-person classroom instruction and 2 hours of live-fire training. Ask 50B to confirm the current schedule and the certificate issued for the course you choose.",
      },
      {
        q: "Will 50B submit my NYPD application?",
        a: "No. 50B provides independent training. You remain responsible for reviewing and submitting your own application to the NYPD.",
      },
      {
        q: "Is 50B part of Gun License NYC?",
        a: "No. 50B EDC Training & Consulting LLC is an independent training provider. Gun License NYC handles registration and payment for the class shown on our site; 50B provides the instruction.",
      },
    ],
  },
]

export const trainingPartnerBySlug = (slug: string): TrainingPartner | null =>
  TRAINING_PARTNERS.find((partner) => partner.slug === slug && partner.visibility !== "hidden") ?? null

export const publishedTrainingPartners = (): TrainingPartner[] =>
  TRAINING_PARTNERS.filter((partner) => partner.visibility === "public")

export const previewableTrainingPartners = (): TrainingPartner[] =>
  TRAINING_PARTNERS.filter((partner) => partner.visibility === "public" || partner.visibility === "coming_soon")

export const trainingPartnerPath = (partner: TrainingPartner): string => `/${partner.slug}`
