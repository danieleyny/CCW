import "server-only"

import { TRAINING_CONFIG } from "@/content/training/config"
import { renderEmail } from "@/lib/email/template"
import { sendEmail } from "@/lib/email"
import { generateIcs } from "@/lib/calendar/ics"
import { brand } from "@/config/brand"
import type { TrainingSession } from "./types"
import { formatSessionTime, formatTrainingPrice } from "./format"

function sessionLine(sessions: TrainingSession[]) {
  return sessions.map((s) => {
    const date = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(`${s.date}T12:00:00Z`))
    return `${date} · ${formatSessionTime(s.start, s.end)}`
  }).join(", ")
}
function trainingIcs(registrationId: string, sessions: TrainingSession[]) {
  return sessions.map((s, index) => generateIcs({
    uid: `${registrationId}-${index + 1}@gunlicensenyc.com`,
    start: `${s.date}T${s.start}:00-05:00`, end: `${s.date}T${s.end}:00-05:00`,
    summary: `NYS CCW Licensing Class (Session ${index + 1})`,
    location: "Manhattan (address in confirmation email)",
    description: "Bring a government-issued photo ID. Your exact address arrives by email.",
    organizerName: brand.name,
  })).join("\r\n")
}

export async function sendTrainingPaidEmails(input: {
  registration: { id: string; first_name: string; middle_name: string; last_name: string; email: string; mobile_phone: string; home_phone: string; address1: string; address2: string; city: string; state: string; zip: string; dob: string; gender: string; us_citizen: string; experience: string; background: string; emergency_name: string; emergency_phone: string; medical_notes: string | null; sms_opt_in: boolean; amount_cents: number }
  course: { title: string; sessions: TrainingSession[]; location_public: string; vendor_class_urls: string[]; vendor_access_code: string | null }
}) {
  const name = [input.registration.first_name, input.registration.middle_name, input.registration.last_name].filter(Boolean).join(" ")
  const dates = sessionLine(input.course.sessions)
  const customer = renderEmail({
    eyebrow: "Training registration", heading: `You're registered: NYS CCW class, ${dates}`,
    paragraphs: [`Receipt: ${formatTrainingPrice(input.registration.amount_cents)} paid for ${input.course.title}.`, `Sessions: ${dates}. We're registering you with the instructor now. You'll get the exact address ${TRAINING_CONFIG.CONFIRMATION_SLA_COPY}.`, "Bring a government-issued photo ID to session 1."],
    cta: { label: "View refund policy", url: `${brand.url}${TRAINING_CONFIG.REFUND_POLICY_URL}` },
  })
  const team = renderEmail({
    eyebrow: "New training registration", heading: `New training registration: ${name}, ${input.course.title}`,
    paragraphs: [
      `Email: ${input.registration.email} · Mobile: ${input.registration.mobile_phone} · Home: ${input.registration.home_phone || "—"}`,
      `Address: ${input.registration.address1} ${input.registration.address2 || ""}, ${input.registration.city}, ${input.registration.state} ${input.registration.zip}`,
      `DOB: ${input.registration.dob} · Gender: ${input.registration.gender} · Citizenship: ${input.registration.us_citizen} · Experience: ${input.registration.experience} · Background: ${input.registration.background}`,
      `Emergency: ${input.registration.emergency_name} · ${input.registration.emergency_phone} · SMS reminders: ${input.registration.sms_opt_in ? "yes" : "no"}`,
      `Medical/special needs: ${input.registration.medical_notes || "none supplied"}`,
      `Vendor registration links: ${input.course.vendor_class_urls.join(" | ") || "not configured"}`,
      "The private class access code is available only on the admin training page.",
    ],
    cta: { label: "Open training admin", url: `${brand.url}/admin/training` },
  })
  await Promise.all([
    sendEmail({ to: input.registration.email, subject: `You're registered: NYS CCW class, ${dates}`, html: customer.html, text: customer.text, attachments: [{ filename: "nys-ccw-class.ics", content: trainingIcs(input.registration.id, input.course.sessions), contentType: "text/calendar" }] }),
    sendEmail({ to: brand.contact.email, subject: `New training registration: ${name}, ${input.course.title}`, html: team.html, text: team.text }),
  ])
}

export async function sendTrainingConfirmedEmail(input: { email: string; name: string; title: string; locationPrivate: string | null }) {
  const email = renderEmail({
    eyebrow: "Class details confirmed", heading: "Your NYS CCW class details are confirmed",
    paragraphs: [`Hi ${input.name}, your registration for ${input.title} is confirmed.`, input.locationPrivate ? `Exact class address: ${input.locationPrivate}` : "The exact class address will be sent separately.", "Please bring a government-issued photo ID."],
  })
  return sendEmail({ to: input.email, subject: "Your NYS CCW class details are confirmed", html: email.html, text: email.text })
}
