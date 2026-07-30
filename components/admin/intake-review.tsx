import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/format"
import { INTAKE_STEPS, QUESTIONNAIRE, type WizardAnswers } from "@/lib/intake/answers"

/**
 * ADMIN-ONLY read-only playback of the raw intake answers a client typed into
 * the wizard (`intake_sessions.answers`). Mirrors the wizard's step grouping and
 * labels so staff can read what was submitted. Rendered ONLY on the staff-gated
 * admin case page — never on an instructor route (the privacy firewall keeps
 * instructors out of intake answers). It displays data only for intakes that
 * actually saved; a missing row means the submission never wrote (see the
 * empty state).
 */
export interface IntakeData {
  answers: WizardAnswers
  currentStep: number | null
  completedAt: string | null
  updatedAt: string | null
}

const dash = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v))
const RESIDENCE: Record<string, string> = {
  nyc: "NYC resident / place of business",
  non_resident: "Non-resident (Special Carry)",
}
const LICENSE: Record<string, string> = { carry: "Concealed carry", premises: "Premises — business" }
const CITIZENSHIP: Record<string, string> = { citizen: "U.S. citizen", lpr: "Lawful permanent resident" }
const TRAINING: Record<string, string> = { completed: "Completed", planned: "Not yet — planned" }

function yn(v: boolean | undefined) {
  return v === undefined ? "—" : v ? "Yes" : "No"
}
function height(inches?: number) {
  if (!inches) return "—"
  return `${Math.floor(inches / 12)}′${inches % 12}″ (${inches} in)`
}
function monthRange(from?: string, to?: string) {
  if (!from && !to) return "—"
  return `${from || "?"} – ${to || "present"}`
}

export function IntakeReview({ intake }: { intake: IntakeData | null }) {
  // ── No row at all: the "did it even save?" diagnosis staff need. ──────────
  if (!intake) {
    return (
      <div className="rounded-lg border border-warn/30 bg-warn/8 p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-warn">
          <AlertTriangle className="size-4 shrink-0" />
          No intake responses have been saved for this applicant yet.
        </div>
        <p className="mt-2 text-sm text-text-mid">
          If they say they completed intake, their submission may not have saved. Confirm the
          intake-save path is working, then have them re-run the wizard — this viewer will show their
          answers as soon as a session is written.
        </p>
      </div>
    )
  }

  const a = intake.answers ?? {}
  const totalSteps = INTAKE_STEPS.length
  const q = a.questionnaire ?? []
  const qYes = q.filter((x) => x.yes)

  return (
    <div className="space-y-6">
      {/* Status header — completeness at a glance. */}
      <div className="rounded-lg border border-hairline bg-card p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {intake.completedAt ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-ok">
              <CheckCircle2 className="size-4" /> Completed {formatDate(intake.completedAt)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-warn">
              <Clock className="size-4" /> Not completed
            </span>
          )}
          {intake.currentStep != null && (
            <span className="text-text-mid">
              Reached step {Math.min(intake.currentStep, totalSteps)} of {totalSteps}
            </span>
          )}
          {intake.updatedAt && (
            <span className="text-text-low">Last updated {formatDateTime(intake.updatedAt)}</span>
          )}
        </div>
        {!intake.completedAt && (
          <p className="mt-2 text-xs text-text-low">
            Intake is saved per step, so a not-completed session can still hold partial answers below.
          </p>
        )}
      </div>

      {/* Eligibility */}
      <Section title="Eligibility">
        <Row label="Date of birth" value={dash(a.dob)} />
        <Row label="Residence status" value={a.residence ? RESIDENCE[a.residence] : "—"} />
        <Row label="License type" value={a.licenseType ? LICENSE[a.licenseType] : "—"} />
        <Row label="Borough" value={dash(a.borough)} />
        <Row label="Felony / serious-offense conviction" value={yn(a.prohibitorFelony)} />
        <Row label="Disqualifying mental-health adjudication" value={yn(a.prohibitorMentalHealth)} />
        <Row label="Active order of protection" value={yn(a.prohibitorActiveOop)} />
        <Row label="Current unlawful drug use" value={yn(a.prohibitorUnlawfulDrug)} />
      </Section>

      {/* Identity & residence */}
      <Section title="Identity & residence">
        <Row label="Middle initial" value={dash(a.middleInitial)} />
        <Row label="Maiden name / alias" value={dash(a.aliasName)} />
        <Row
          label="Legal address"
          value={dash(
            [a.legalStreet, a.legalApt && `Apt ${a.legalApt}`, a.legalCity, a.legalState]
              .filter(Boolean)
              .join(", ") || undefined
          )}
        />
        <Row label="Photo ID type" value={dash(a.photoIdType)} />
        <Row label="Citizenship" value={a.citizenship ? CITIZENSHIP[a.citizenship] : "—"} />
        {a.citizenship === "lpr" && (
          <>
            <Row label="LPR under 7 years' residence" value={yn(a.lprUnder7yr)} />
            <Row label="Alien registration number" value={dash(a.alienRegistrationNumber)} />
          </>
        )}
        <Row label="Proof-of-residence method" value={dash(a.residenceProof)} />
        <Row label="Place of birth" value={dash(a.placeOfBirth)} />
        <Row label="Height" value={height(a.heightInches)} />
        <Row label="Weight" value={a.weightLbs ? `${a.weightLbs} lb` : "—"} />
        <Row label="Sex" value={dash(a.sex)} />
        <Row label="Hair" value={dash(a.hairColor)} />
        <Row label="Eyes" value={dash(a.eyeColor)} />
      </Section>

      {a.licenseType === "premises" && (
        <Section title="Business (premises track)">
          <Row label="Business name" value={dash(a.businessName)} />
          <Row label="Type of business" value={dash(a.businessType)} />
          <Row
            label="Business address"
            value={dash(
              [a.businessStreet, a.businessCity, a.businessState, a.businessZip].filter(Boolean).join(", ") ||
                undefined
            )}
          />
          <Row label="Business phone" value={dash(a.businessPhone)} />
          <Row label="Occupation" value={dash(a.occupation)} />
        </Section>
      )}

      {a.residence === "non_resident" && (
        <Section title="Out-of-city license (Special Carry)">
          <Row label="Basic license number" value={dash(a.outOfCityLicenseNumber)} />
          <Row label="Issued by" value={dash(a.outOfCityIssuedBy)} />
          <Row label="County" value={dash(a.outOfCityCounty)} />
          <Row label="Date issued" value={a.outOfCityIssuedOn ? formatDate(a.outOfCityIssuedOn) : "—"} />
          <Row label="Expiration date" value={a.outOfCityExpiresOn ? formatDate(a.outOfCityExpiresOn) : "—"} />
        </Section>
      )}

      {/* Household & safeguard */}
      <Section title="Household & safeguard">
        <SubTable
          caption="Cohabitants (18+)"
          columns={["Name", "Relationship"]}
          rows={(a.cohabitants ?? []).map((c) => [dash(c.name), dash(c.relationship)])}
        />
        <div className="mt-3 space-y-0">
          <Row label="Safeguard method" value={dash(a.safeguardMethod)} />
          <Row label="Safeguard person" value={dash(a.safeguardName)} />
          <Row label="Safeguard relationship" value={dash(a.safeguardRelation)} />
          <Row label="Safeguard address" value={dash(a.safeguardAddress)} />
          <Row label="Safeguard phone" value={dash(a.safeguardPhone)} />
        </div>
      </Section>

      {/* Disclosures (also on the Disclosures tab — shown here in intake context) */}
      <Section title="Disclosures">
        <SubTable
          caption="Arrests / summonses"
          columns={["Date", "Court / jurisdiction", "Disposition", "Explanation"]}
          rows={(a.arrests ?? []).map((r) => [
            r.occurredOn ? formatDate(r.occurredOn) : "—",
            dash(r.jurisdiction),
            dash(r.disposition),
            dash(r.narrative),
          ])}
        />
        <SubTable
          caption="Orders of protection"
          columns={["Date", "Jurisdiction", "Explanation"]}
          rows={(a.ordersOfProtection ?? []).map((r) => [
            r.occurredOn ? formatDate(r.occurredOn) : "—",
            dash(r.jurisdiction),
            dash(r.narrative),
          ])}
        />
        <SubTable
          caption="Domestic incidents"
          columns={["Date", "Explanation"]}
          rows={(a.domesticIncidents ?? []).map((r) => [
            r.occurredOn ? formatDate(r.occurredOn) : "—",
            dash(r.narrative),
          ])}
        />
        <div className="mt-3">
          <div className="engraved mb-2 text-text-low">
            Questionnaire (Q10–28) — {qYes.length} answered &ldquo;yes&rdquo;
          </div>
          {q.length === 0 ? (
            <p className="text-sm text-text-low">—</p>
          ) : (
            <ul className="space-y-2">
              {q
                .slice()
                .sort((x, y) => x.no - y.no)
                .map((item) => {
                  const text = QUESTIONNAIRE.find((qq) => qq.no === item.no)?.text ?? `Question ${item.no}`
                  return (
                    <li key={item.no} className="rounded-md border border-hairline p-2.5 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs text-text-low">Q{item.no}</span>
                        <span
                          className={item.yes ? "font-medium text-warn" : "text-text-mid"}
                        >
                          {item.yes ? "YES" : "No"}
                        </span>
                        <span className="flex-1 text-text-mid">{text}</span>
                      </div>
                      {item.yes && item.narrative && (
                        <p className="mt-1.5 border-l-2 border-warn/30 pl-2 text-xs text-text-mid">
                          {item.narrative}
                        </p>
                      )}
                    </li>
                  )
                })}
            </ul>
          )}
        </div>
      </Section>

      {/* Carry-specific & history */}
      <Section title="Carry-specific & history">
        <Row label="Training status" value={a.trainingStatus ? TRAINING[a.trainingStatus] : "—"} />
        <Row label="Training instructor" value={dash(a.trainingInstructor)} />
        <Row label="Training completion date" value={a.trainingDate ? formatDate(a.trainingDate) : "—"} />
        <Row label="Veteran" value={yn(a.isVeteran)} />
        <Row label="Retired law enforcement" value={yn(a.isRetiredLeo)} />
        <Row label="Legal name change" value={yn(a.hasNameChange)} />
        <Row label="Holds another firearms license" value={yn(a.hasOtherLicense)} />

        <div className="mt-3 space-y-4">
          <SubTable
            caption="Character references"
            columns={["Name", "Email"]}
            rows={(a.references ?? []).map((r) => [dash(r.name), dash(r.email)])}
          />
          <SubTable
            caption="Social-media accounts"
            columns={["Platform", "Handle"]}
            rows={(a.socialAccounts ?? []).map((s) => [dash(s.platform), dash(s.handle)])}
          />
          {a.socialHandles && <Row label="Social (legacy free-text)" value={a.socialHandles} />}
          <SubTable
            caption="Residence history (past 5 years)"
            columns={["Dates", "Address"]}
            rows={(a.residenceHistory ?? []).map((h) => [monthRange(h.fromMonth, h.toMonth), dash(h.address)])}
          />
          <SubTable
            caption="Employment history (past 5 years)"
            columns={["Dates", "Employer", "Address", "Occupation"]}
            rows={(a.employmentHistory ?? []).map((h) => [
              monthRange(h.fromMonth, h.toMonth),
              dash(h.employerName ?? h.employer),
              dash(h.employerAddress),
              dash(h.occupation),
            ])}
          />
        </div>
      </Section>

      {/* Developer escape hatch — admin-only, collapsed. */}
      <details className="rounded-lg border border-hairline bg-surface-2/40 p-3 text-xs">
        <summary className="cursor-pointer select-none text-text-low">Raw data (developer)</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-text-mid">
          {JSON.stringify(intake.answers, null, 2)}
        </pre>
      </details>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="engraved mb-2 text-text-low">{title}</h3>
      <div className="rounded-lg border border-hairline bg-card p-4">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-hairline/50 py-2 last:border-0">
      <span className="text-sm text-text-mid">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function SubTable({
  caption,
  columns,
  rows,
}: {
  caption: string
  columns: string[]
  rows: string[][]
}) {
  return (
    <div className="mt-1">
      <div className="engraved mb-1.5 text-text-low">
        {caption} ({rows.length})
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-text-low">—</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-hairline">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-2/50 text-left text-xs text-text-low">
                {columns.map((c) => (
                  <th key={c} className="px-3 py-1.5 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-hairline/50 last:border-0">
                  {r.map((cell, j) => (
                    <td key={j} className="px-3 py-1.5 align-top text-text-mid">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
