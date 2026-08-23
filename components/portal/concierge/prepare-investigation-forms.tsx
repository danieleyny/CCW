"use client"

import { useState, useTransition } from "react"
import { FileText, Loader2, Download } from "lucide-react"
import { toast } from "sonner"
import { prepareInvestigationForms } from "@/app/portal/requirements/actions"
import { Button } from "@/components/ui/button"

/**
 * Phase 4 — pre-prepare the investigation-phase forms on demand. Fills the
 * official employment-authorization + HIPAA forms with the applicant's details
 * (SSN left blank to write by hand) so they're ready if the investigator asks.
 */
export function PrepareInvestigationForms() {
  const [pending, start] = useTransition()
  const [forms, setForms] = useState<{ name: string; url: string }[]>([])

  return (
    <div className="mt-3">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await prepareInvestigationForms()
            if (r.error || !r.forms) {
              toast.error(r.error ?? "Couldn't prepare the forms.")
              return
            }
            setForms(r.forms)
            toast.success("Prepared — SSN left blank to fill in by hand.")
          })
        }
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
        <span className="ml-1">Prepare the after-filing forms</span>
      </Button>
      {forms.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {forms.map((f) => (
            <li key={f.url}>
              <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal underline">
                <Download className="size-3" /> {f.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
