import { ClipboardSignature } from "lucide-react"
import { saveInstructorStatement } from "@/app/instructor/cases/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface InstructorStatement {
  met_applicant: boolean
  no_danger: boolean
  credentials: string | null
  instructor_name: string | null
  instructor_address: string | null
  instructor_phone: string | null
  range_name: string | null
  training_location: string | null
  notes: string | null
  submitted_at: string | null
}

/**
 * §5-09 pre-licence exemption statement — the instructor's own verified statement,
 * entered in-platform. It fills the OFFICIAL PLE-01 form (the applicant generates,
 * then it's printed + NOTARISED on paper — this is not a digital signature). Per
 * 38 RCNY §5-09 the statement must cover: met the applicant, a danger assessment,
 * the instructor's credentials, name/address/telephone, and the exact training
 * location.
 */
export function PrelicenseStatementForm({
  caseId,
  statement,
}: {
  caseId: string
  statement: InstructorStatement | null
}) {
  const s = statement
  return (
    <div className="rounded-lg border border-hairline bg-card p-4">
      <div className="flex items-center gap-2">
        <ClipboardSignature className="size-4 text-brass" />
        <h2 className="text-sm font-medium">Pre-licence exemption statement (38 RCNY §5-09)</h2>
      </div>
      <p className="mt-1 text-xs text-text-mid">
        Your verified statement fills the applicant&apos;s official Request for License Pre-Exemption. It&apos;s
        printed and notarised on paper — nothing here is a signature. The exact §5-09 wording is confirmed with
        counsel before filing.
      </p>
      {s?.submitted_at && (
        <p className="mt-2 rounded-md border border-ok/25 bg-ok/8 px-3 py-2 text-xs text-ok">
          Submitted — the applicant&apos;s form now carries your statement. You can still update it.
        </p>
      )}

      <form action={saveInstructorStatement} className="mt-3 space-y-3">
        <input type="hidden" name="caseId" value={caseId} />

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="metApplicant" defaultChecked={s?.met_applicant} className="mt-0.5 size-4" />
          <span>I have personally met the applicant.</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="noDanger" defaultChecked={s?.no_danger} className="mt-0.5 size-4" />
          <span>In my assessment the applicant poses no danger to themselves or to others.</span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Your name" name="instructorName" defaultValue={s?.instructor_name ?? ""} />
          <Field label="Your telephone" name="instructorPhone" defaultValue={s?.instructor_phone ?? ""} />
          <Field label="Your address" name="instructorAddress" defaultValue={s?.instructor_address ?? ""} />
          <Field
            label="Your certification / authority"
            name="credentials"
            defaultValue={s?.credentials ?? ""}
            placeholder="e.g. DCJS-certified firearms instructor"
          />
          <Field label="Range / school name" name="rangeName" defaultValue={s?.range_name ?? ""} />
          <Field
            label="Exact training location + contact"
            name="trainingLocation"
            defaultValue={s?.training_location ?? ""}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-mid">Notes (optional)</label>
          <textarea
            name="notes"
            defaultValue={s?.notes ?? ""}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-signal/50 focus-visible:ring-2 focus-visible:ring-signal/40"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="submit" value="1">
            Submit statement
          </Button>
          <Button type="submit" name="submit" value="0" variant="outline">
            Save draft
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string
  name: string
  defaultValue: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-mid">{label}</label>
      <Input name={name} defaultValue={defaultValue} placeholder={placeholder} />
    </div>
  )
}
