"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { BellRing, CalendarDays, Check, ChevronRight, Clock3, FileCheck2, GraduationCap, IdCard, MapPin, ShieldCheck, UserRound, X } from "lucide-react"
import type { PublicTrainingClass } from "@/lib/training/types"
import { TrainingParticles } from "./TrainingParticles"
import { TrainingPayment } from "./TrainingPayment"
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion"
import { formatSessionTime, formatTrainingPrice } from "@/lib/training/format"
import { TRAINING_CLASS_PRICE_CENTS } from "@/content/training/config"
import styles from "./TrainingSection.module.css"

type Draft = Record<string, string | boolean>
const DRAFT_KEY = "glnyc_training_draft"
const initial: Draft = { state: "NY", smsOptIn: false, agreedAttendance: false, agreedTerms: false, gender: "", usCitizen: "", experience: "", background: "" }

function fmtDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", ...options }).format(new Date(`${date}T12:00:00Z`))
}
function classTitle(count: number) { return count === 1 ? "One day. One certificate." : count === 2 ? "Two evenings. One certificate." : `${["", "", "", "Three", "Four", "Five"][count] ?? count} evenings. One certificate.` }
function input(draft: Draft, name: string) { return String(draft[name] ?? "") }
function fullName(draft: Draft) { return [input(draft, "firstName"), input(draft, "middleName"), input(draft, "lastName")].filter(Boolean).join(" ") }

export default function TrainingSection() {
  const [course, setCourse] = useState<PublicTrainingClass | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState<"ticket" | "form" | "done" | "waitlist">("ticket")
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === "undefined") return initial
    try { return { ...initial, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}") } } catch { return initial }
  })
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState("")
  const [registrationId, setRegistrationId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [error, setError] = useState("")
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlisted, setWaitlisted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const reserveRef = useRef<HTMLButtonElement>(null)
  const firstInput = useRef<HTMLInputElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => { fetch("/api/training/next").then((r) => r.ok ? r.json() : null).then((data) => setCourse(data?.class ?? null)).finally(() => setLoaded(true)) }, [])
  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch {} }, [draft])
  useEffect(() => { if (mode === "form") { const timer = window.setTimeout(() => firstInput.current?.focus({ preventScroll: true }), reduced ? 0 : 800); cardRef.current?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }); return () => clearTimeout(timer) } }, [mode, reduced])
  useEffect(() => {
    if (mode !== "form") return
    document.body.dataset.bookingOpen = "true"
    return () => { delete document.body.dataset.bookingOpen }
  }, [mode])

  const sessionLine = useMemo(() => course?.sessions.map((s) => fmtDate(s.date, { weekday: "short", month: "short", day: "numeric" })).join(" · ") ?? "", [course])
  const status = !course ? "closed" : course.status
  const empty = loaded && !course
  const priceCents = course?.priceCents ?? TRAINING_CLASS_PRICE_CENTS
  const priceLabel = formatTrainingPrice(priceCents)
  const statusLabel = status === "almost_full" ? `Only ${course?.seatsLeft} seats left` : status === "sold_out" ? "Sold out" : status === "open" ? "Registration open" : "Next class announced soon"
  const availabilityLine = course
    ? [
        course.capacity != null && course.seatsLeft !== 0
          ? course.seatsLeft != null && course.seatsLeft <= 3 ? `Only ${course.seatsLeft} seats left` : "Seats are limited"
          : null,
        course.nextAfter ? `Next class: ${course.nextAfter}` : null,
      ].filter(Boolean).join(" · ")
    : ""
  function update(name: string, value: string | boolean) { setDraft((old) => ({ ...old, [name]: value })) }
  function close() { setMode("ticket"); setStep(0); window.setTimeout(() => reserveRef.current?.focus(), reduced ? 0 : 300) }
  function open() {
    if (!course || status === "closed" || status === "sold_out") { setMode("waitlist"); return }
    if (!course.checkoutAvailable) return
    setMode("form"); setStep(0); setError("")
  }

  const requiredForStep = step === 0 ? ["firstName", "lastName", "dob", "gender", "email", "mobilePhone", "address1", "city", "state", "zip"] : ["usCitizen", "experience", "background", "emergencyName", "emergencyPhone"]
  function validateStep() {
    const empty = requiredForStep.find((key) => !input(draft, key))
    if (empty) { setError("Please complete every required field before continuing."); return false }
    if (step === 0 && !/^\d{5}$/.test(input(draft, "zip"))) { setError("Enter a five-digit ZIP code."); return false }
    if (step === 0 && new Date(input(draft, "dob")) > new Date(new Date().setFullYear(new Date().getFullYear() - 18))) { setError("You must be 18 or older to register for this class."); return false }
    if (step === 1 && !file) { setError("Please upload a photo of your government ID."); return false }
    setError(""); return true
  }
  async function uploadId() {
    if (!course || !file) return ""
    const type = file.type === "image/jpeg" ? "image/jpeg" : file.type === "image/png" ? "image/png" : file.type === "application/pdf" ? "application/pdf" : file.type === "image/heic" ? "image/heic" : ""
    if (!type || file.size > 10 * 1024 * 1024) throw new Error("Use a JPG, PNG, HEIC, or PDF under 10 MB.")
    const signed = await fetch("/api/training/id-upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId: course.id, contentType: type, size: file.size }) }).then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.error); return body })
    const upload = await fetch(signed.signedUrl, { method: "PUT", headers: { "Content-Type": type }, body: file })
    if (!upload.ok) throw new Error("Your ID could not be uploaded. Please try again.")
    setFileKey(signed.fileKey); return signed.fileKey as string
  }
  async function review() {
    if (!validateStep() || !course) return
    try {
      setError(""); const key = fileKey || await uploadId()
      const payload = { ...draft, classId: course.id, registrationId: registrationId || undefined, fileKey: key, smsOptIn: !!draft.smsOptIn, agreedAttendance: true, agreedTerms: true, utm: {} }
      const response = await fetch("/api/training/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "We could not prepare your payment.")
      setRegistrationId(body.registrationId); setClientSecret(body.clientSecret); setStep(2)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.") }
  }
  async function joinWaitlist(event: React.FormEvent) {
    event.preventDefault(); if (!waitlistEmail) return
    const response = await fetch("/api/training/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId: course?.id ?? null, email: waitlistEmail }) })
    if (response.ok) setWaitlisted(true); else setError("We could not save your request. Please try again.")
  }
  function paid() { try { sessionStorage.removeItem(DRAFT_KEY) } catch {}; setMode("done") }

  return <section id="training" className={styles.training} data-reduced={reduced} aria-labelledby="training-title">
    <TrainingParticles className={styles.particles} />
    <div className={styles.inner}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Upcoming training class{course ? ` · ${fmtDate(course.sessions[0]!.date, { month: "long", year: "numeric" })}` : ""}</p><h2 id="training-title">Your required training,<br />booked in minutes.</h2><p>The NYS concealed-carry licensing course, taught by a certified instructor in Manhattan. Reserve your seat here, and we take care of the registration with the instructor for you.</p></div>
        {course?.sessions[0] && <div className={styles.next}><span>Next class</span><strong>{fmtDate(course.sessions[0].date, { weekday: "short", month: "short", day: "numeric" })}</strong></div>}
      </header>
      <div ref={cardRef} className={styles.card} data-mode={mode} id="training-form">
        <i className={styles.flare} aria-hidden /><i className={styles.glowA} data-allow-overflow aria-hidden /><i className={styles.glowB} data-allow-overflow aria-hidden />
        {mode === "ticket" && <>
          <div className={styles.ticketMain} data-empty={empty || undefined}>
            <div className={styles.cardTop}><p className={styles.kicker}>NYS CCW Licensing Class</p><span className={styles.status} data-state={status}><i />{loaded ? statusLabel : "Checking availability"}</span></div>
            <h3>{course ? classTitle(course.sessions.length) : "Your next class, announced soon."}</h3>
            {empty && <>
              <p className={styles.emptyLede}>We&apos;re lining up the next session with our certified instructor in Manhattan. Get on the list and you&apos;ll hear the moment dates are posted, before seats fill.</p>
              <div className={styles.tiles} data-empty="true" aria-label="Next class date to be announced">
                <div className={styles.tile}><span>MONTH</span><strong>TBA</strong><small>Being scheduled</small></div>
                <div className={styles.tile}><span>DATES</span><strong>TBA</strong><small>Posted with dates</small></div>
                <div className={styles.tile}><span>SEATS</span><strong>TBA</strong><small>Limited per class</small></div>
              </div>
              <div className={styles.benefits}>
                <Benefit icon={<GraduationCap />} title="The required NYS course" text="The concealed-carry licensing course your application needs." />
                <Benefit icon={<MapPin />} title="Taught in Manhattan" text="By a certified instructor, in person." />
                <Benefit icon={<CalendarDays />} title="Timed to your filing" text="We help you plan around the six-month certificate window." />
                <Benefit icon={<BellRing />} title="First to know" text="One email when dates go live. Nothing else." />
              </div>
              <div className={styles.emptyWait}>
                <p><b>Don&apos;t wait on training to start your file.</b> References, records and documents can all be in motion now.</p>
                <Link href="/eligibility">Start your application →</Link>
              </div>
            </>}
            {course && <><div className={styles.tiles}>{course.sessions.map((session, index) => <div className={styles.tile} key={session.date} data-tile={index}><span>{fmtDate(session.date, { month: "short" }).toUpperCase()} · {fmtDate(session.date, { weekday: "short" }).toUpperCase()}</span><strong>{fmtDate(session.date, { day: "2-digit" })}</strong><small>{formatSessionTime(session.start, session.end)}</small></div>)}</div>
            <p className={styles.meta}><MapPin size={15} /> {course.locationPublic} · exact address sent after you register <span /> <Clock3 size={15} /> {course.hoursCopy} · attend all three</p>
            <div className={styles.benefits}><Benefit icon={<FileCheck2 />} title="NYS training certificate" text="Issued by the instructor on completion. It’s the certificate your CCW application requires." /><Benefit icon={<UserRound />} title={course.instructorName ?? "Certified NYS instructor"} text="Small private class in Manhattan, run by a state-certified firearms instructor." /><Benefit icon={<ShieldCheck />} title="We handle the registration" text="You sign up once, here. We register you with the instructor and send every detail." /><Benefit icon={<IdCard />} title="Name matched to your ID" text="We put your name on the certificate exactly as it appears on your ID." /></div></>}
          </div>
          <div className={styles.perf} aria-hidden />
          <aside className={styles.stub}><p>Your seat</p><strong>{priceLabel}</strong><span>all-in</span><p className={styles.stubText}>One payment covers the full course and your registration. No hidden fees.</p><ul><li><Check />Takes about 4 minutes, right here</li><li><Check />Pay securely by card</li><li><Check />We register you with the instructor</li></ul><button ref={reserveRef} type="button" className={styles.reserve} onClick={open} aria-expanded={false} aria-controls="training-form" disabled={Boolean(course && !course.checkoutAvailable && status !== "sold_out")}>{!course || status === "closed" || status === "sold_out" ? "Get notified about the next class →" : !course.checkoutAvailable ? "Registration opens soon" : "Reserve my seat →"}</button>{course && !course.checkoutAvailable && status !== "closed" && status !== "sold_out" && <button type="button" className={styles.notify} onClick={() => setMode("waitlist")}>Get notified when it opens →</button>}{availabilityLine && <small className={styles.under}>{availabilityLine}</small>}{course?.previewCheckout && <small className={styles.previewNote}>Preview: refund policy not set</small>}</aside>
        </>}
        {mode === "waitlist" && <div className={styles.waitlist}><button type="button" className={styles.close} onClick={close} aria-label="Close sign-up and return to class details"><X /></button><p className={styles.kicker}>Next NYS CCW class</p><h3>{waitlisted ? "You’re on the list." : "Get first notice."}</h3><p>{waitlisted ? "We’ll email you when the next class opens." : "Leave your email and we’ll let you know when the next Manhattan class is available."}</p>{!waitlisted && <form onSubmit={joinWaitlist}><label>Email<input type="email" required value={waitlistEmail} onChange={(e) => setWaitlistEmail(e.target.value)} /></label><button className={styles.reserve}>Notify me →</button></form>}</div>}
        {mode === "form" && course && <div className={styles.formShell} role="region" aria-label="Reserve your seat">
          <header className={styles.bookingHeader}>
            <div className={styles.bookingEyebrowRow}><p>Reserve your seat</p><button type="button" onClick={close} aria-label="Close sign-up and return to class details"><X /></button></div>
            <div className={styles.bookingTitleRow}><h3>NYS CCW class</h3><p><strong>{priceLabel}</strong><span>all-in</span></p></div>
            <div className={styles.bookingDates}>
              <div className={styles.dateChips}>{course.sessions.slice(0, 3).map((session, index) => <span className={styles.dateChip} data-chip={index} key={session.date}><small>{fmtDate(session.date, { weekday: "short" })}</small><b>{fmtDate(session.date, { day: "numeric" })}</b></span>)}</div>
              <p className={styles.bookingMeta}><span>{fmtDate(course.sessions[0]!.date, { month: "short" })} · {formatSessionTime(course.sessions[0]!.start, course.sessions[0]!.end)}</span><span>{course.locationPublic}</span></p>
            </div>
            <ol className={styles.steps}>{["Your details", "ID & info", "Payment"].map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} data-current={step === index} data-done={step > index}><b>{step > index ? <Check aria-hidden="true" /> : index + 1}</b><span>{label}</span></li>)}</ol>
            <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}>{[0, 1, 2].map((part) => <i key={part} data-filled={part <= step} />)}</div>
          </header>
          <p className={styles.live} aria-live="polite">{error}</p>
          {step === 0 && <DetailsStep draft={draft} update={update} firstInput={firstInput} />}
          {step === 1 && <ClassInfoStep draft={draft} update={update} file={file} setFile={setFile} />}
          {step === 2 && <ReviewStep course={course} draft={draft} sessionLine={sessionLine} />}
          {step === 2 && <div className={styles.agreements}><label><input type="checkbox" checked={!!draft.agreedAttendance} onChange={(e) => update("agreedAttendance", e.target.checked)} /> I’ll attend all three sessions and bring a government-issued photo ID.</label><label><input type="checkbox" checked={!!draft.agreedTerms} onChange={(e) => update("agreedTerms", e.target.checked)} /> I agree to the class terms, instructor’s class policies, and refund policy.</label><label><input type="checkbox" checked={!!draft.smsOptIn} onChange={(e) => update("smsOptIn", e.target.checked)} /> Text me class reminders.</label>{draft.agreedAttendance && draft.agreedTerms && clientSecret ? <TrainingPayment clientSecret={clientSecret} onPaid={paid} priceCents={priceCents} /> : <button type="button" className={styles.reserve} disabled>Pay {priceLabel} & reserve →</button>}</div>}
          <footer className={styles.formFoot}>{step > 0 ? <button type="button" onClick={() => setStep(step - 1)}>← Back</button> : <button type="button" onClick={close}>← Class details</button>}{step === 0 ? <button type="button" className={styles.continue} onClick={() => validateStep() && setStep(1)}>Continue <ChevronRight /></button> : step === 1 ? <button type="button" className={styles.continue} onClick={review}>Review & pay <ChevronRight /></button> : null}</footer>
        </div>}
        {mode === "done" && <div className={styles.done}><div><Check /></div><p className={styles.kicker}>Payment received</p><h3>Your seat is reserved.</h3><p>We’re registering you with the instructor now. Your confirmation, with the class address, arrives by email within 1 business day.</p><ol><li><b>01</b> Watch for our email</li><li><b>02</b> Add the 3 sessions to your calendar</li><li><b>03</b> Bring your ID to session 1</li></ol>{registrationId && <a href={`/api/training/calendar?rid=${registrationId}`}>Add to calendar (.ics) →</a>}</div>}
      </div>
    </div>
  </section>
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className={styles.benefit}><i>{icon}</i><div><strong>{title}</strong><p>{text}</p></div></div> }
function Field({ label, name, draft, update, type = "text", firstInput, required = true, autoComplete, full = false }: { label: string; name: string; draft: Draft; update: (key: string, value: string) => void; type?: string; firstInput?: React.RefObject<HTMLInputElement | null>; required?: boolean; autoComplete?: string; full?: boolean }) { return <label className={`${styles.field} ${full ? styles.full : ""}`}><span className={styles.label}>{label}{required ? <span className={styles.req} aria-hidden="true">*</span> : <span className={styles.optional}>Optional</span>}</span><input className={styles.input} ref={firstInput} required={required} aria-required={required} type={type} value={input(draft, name)} autoComplete={autoComplete} onChange={(e) => update(name, e.target.value)} /></label> }
function Select({ label, name, options, draft, update, full = false }: { label: string; name: string; options: [string, string][]; draft: Draft; update: (key: string, value: string) => void; full?: boolean }) { return <label className={`${styles.field} ${full ? styles.full : ""}`}><span className={styles.label}>{label}<span className={styles.req} aria-hidden="true">*</span></span><select className={styles.select} required aria-required="true" value={input(draft, name)} onChange={(e) => update(name, e.target.value)}>{[["", "Select"], ...options].map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label> }
function DetailsStep({ draft, update, firstInput }: { draft: Draft; update: (key: string, value: string | boolean) => void; firstInput: React.RefObject<HTMLInputElement | null> }) { return <div className={styles.fields}><Field label="First name" name="firstName" draft={draft} update={update} firstInput={firstInput} autoComplete="given-name" /><Field label="Middle name" name="middleName" draft={draft} update={update} required={false} autoComplete="additional-name" /><Field label="Last name" name="lastName" draft={draft} update={update} autoComplete="family-name" /><Field label="Date of birth" name="dob" draft={draft} update={update} type="date" autoComplete="bday" /><Select label="Gender" name="gender" draft={draft} update={update} options={[["male","Male"],["female","Female"],["na","Prefer not to say"]]} /><Field label="Mobile" name="mobilePhone" draft={draft} update={update} type="tel" autoComplete="tel" /><Field label="Email" name="email" draft={draft} update={update} full autoComplete="email" /><Field label="Home phone" name="homePhone" draft={draft} update={update} type="tel" required={false} full /><Field label="Street address" name="address1" draft={draft} update={update} full autoComplete="address-line1" /><Field label="Address 2" name="address2" draft={draft} update={update} required={false} full autoComplete="address-line2" /><Field label="City" name="city" draft={draft} update={update} autoComplete="address-level2" /><Field label="State" name="state" draft={draft} update={update} autoComplete="address-level1" /><Field label="ZIP" name="zip" draft={draft} update={update} full autoComplete="postal-code" /><p className={styles.note}>Your certificate uses your name exactly as entered here. Match your driver’s license or government ID.</p></div> }
function ClassInfoStep({ draft, update, file, setFile }: { draft: Draft; update: (key: string, value: string | boolean) => void; file: File | null; setFile: (file: File | null) => void }) { return <div className={styles.fields}><Select label="U.S. citizen?" name="usCitizen" draft={draft} update={update} options={[["yes","Yes"],["legal_resident","Legal resident"],["no","No"]]} /><Select label="Firearms experience" name="experience" draft={draft} update={update} options={[["none","None"],["beginner","Beginner"],["intermediate","Intermediate"],["advanced","Advanced"]]} /><Select label="Background" name="background" draft={draft} update={update} full options={[["civilian","Civilian"],["military","Military"],["former_military","Former military"],["law_enforcement","Law enforcement"],["former_law_enforcement","Former law enforcement"],["instructor","Instructor"],["first_responder","First responder"],["gov_contractor","Gov’t employee or contractor"]]} /><Field label="Emergency contact" name="emergencyName" draft={draft} update={update} /><Field label="Their phone" name="emergencyPhone" draft={draft} update={update} type="tel" /><label className={`${styles.field} ${styles.full}`}><span className={styles.label}>Medical conditions or special needs<span className={styles.optional}>Optional</span></span><textarea className={styles.textarea} value={input(draft, "medicalNotes")} onChange={(e) => update("medicalNotes", e.target.value)} /></label><label className={styles.upload}><span className={styles.label}>Photo of your government ID<span className={styles.req} aria-hidden="true">*</span></span><input type="file" accept="image/jpeg,image/png,image/heic,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><span>{file ? file.name : "Drop a file here or choose a file"}</span><small>JPG, PNG, HEIC, or PDF · up to 10 MB · encrypted and only shared with the instructor.</small></label></div> }
function ReviewStep({ course, draft, sessionLine }: { course: PublicTrainingClass; draft: Draft; sessionLine: string }) { return <div className={styles.review}><p>Class <strong>{course.title}</strong></p><p>Sessions <strong>{sessionLine}</strong></p><p>Location <strong>{course.locationPublic} (address by email)</strong></p><p>Name on certificate <strong>{fullName(draft)}</strong></p><p>Total today <strong>{formatTrainingPrice(course.priceCents)}</strong></p></div> }
