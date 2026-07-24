"use client"

import { useState } from "react"
import { Mail, ExternalLink, AlertTriangle } from "lucide-react"
import { brand } from "@/config/brand"
import type { DmvApplicant } from "@/lib/portal/requirement-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * DMV-01 only: applicants get stuck when MyDMV / NY.gov ID returns
 * "There was an error processing your request" (apps-ext.dmv.ny.gov/OIDC).
 * This gives them a real way forward — a pre-filled email that reports the
 * login error and requests their abstract, plus the official offline paths.
 *
 * WHY the email goes to NY State ITS (Fixit@its.ny.gov), not "the DMV": the NY
 * DMV takes NO records requests by email — only MyDMV online, in person, or
 * mail-in (MV-15C), or FOIL. There is no DMV inbox to email an abstract. So the
 * draft reports the blocking OIDC login failure to the state's IT help desk
 * (the right owner of that error) and copies our concierge inbox so our team
 * has a copy and can help. Both recipients are env-overridable.
 */
const DMV_TO = process.env.NEXT_PUBLIC_DMV_REQUEST_TO || "Fixit@its.ny.gov"
const DMV_CC = process.env.NEXT_PUBLIC_DMV_REQUEST_CC || brand.contact.email

export function DmvFallback({ applicant }: { applicant?: DmvApplicant | null }) {
  // Intake never captures the DL/Client ID — collect it here (page-local state).
  const [dlNumber, setDlNumber] = useState("")

  const a = applicant
  const dl = dlNumber.trim() || "[Your NY driver license / client ID number]"

  const subject = `NY driving abstract request — ${a?.fullName || "applicant"}`

  // PRIVACY: name + DOB + address + DL/Client ID is the ENTIRE identifier set.
  // No SSN, not even last four — the app never puts an SSN in an outbound draft.
  const body = [
    "Hello,",
    "",
    "I'm trying to obtain my own New York driving record abstract, but the online MyDMV / NY.gov ID portal returns \"There was an error processing your request\" (apps-ext.dmv.ny.gov/OIDC), so I can't self-serve. Could you help resolve the login error, or advise how to obtain my LIFETIME NY driving abstract?",
    "",
    "If I've lived in another state in the past five years, I also need that state's abstract.",
    "",
    "Identifying information:",
    `- Full legal name: ${a?.fullName || "[Your full legal name]"}`,
    `- Date of birth: ${a?.dob || "[Your date of birth]"}`,
    `- Residential address: ${a?.address || "[Your residential address]"}`,
    `- Phone: ${a?.phone || "[Your phone number]"}`,
    `- Email: ${a?.email || "[Your email]"}`,
    `- NY driver license / client ID number: ${dl}`,
    "",
    "Thank you.",
  ].join("\n")

  // Real mailto with URL-encoded subject + body; cc built into the href.
  const mailto = `mailto:${encodeURIComponent(DMV_TO)}?cc=${encodeURIComponent(DMV_CC)}&subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`

  return (
    <div className="mt-2 rounded-md border border-warn/30 bg-warn/5 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-warn">Trouble with the DMV site?</p>
          <p className="mt-1 text-xs text-text-mid">
            If MyDMV keeps showing &ldquo;There was an error processing your request,&rdquo; you have two
            ways forward.
          </p>

          <div className="mt-3 space-y-1.5">
            <Label htmlFor="dmv-dl" className="text-xs">
              NY driver license / client ID number{" "}
              <span className="text-text-low">(optional — added to the draft)</span>
            </Label>
            <Input
              id="dmv-dl"
              value={dlNumber}
              onChange={(e) => setDlNumber(e.target.value)}
              placeholder="e.g. 123 456 789"
              className="h-9 max-w-xs"
              autoComplete="off"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" asChild>
              {/* A real mailto anchor — opens the user's mail client with the draft. */}
              <a href={mailto}>
                <Mail className="mr-1.5 size-3.5" /> Email my request
              </a>
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-text-low">
            This reports the DMV login error to NY State IT support and copies our team, so we can help
            you get your abstract. Your name, date of birth, and address are filled in — never your
            Social Security number. You can also use the official mail-in option below.
          </p>

          <div className="mt-3 border-t border-hairline pt-3">
            <p className="text-xs font-medium text-text-mid">Official offline options (always work):</p>
            <ul className="mt-1.5 space-y-1 text-xs text-text-mid">
              <li>
                <span className="font-medium">By mail or in person:</span> complete form{" "}
                <a
                  href="https://dmv.ny.gov/forms/mv15c.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="text-signal underline"
                >
                  MV-15C <ExternalLink className="inline size-3" />
                </a>{" "}
                and submit it with the <span className="font-medium">$10</span> fee. Mail to NYS DMV, 6
                Empire State Plaza, Albany, NY 12228, or bring it to a DMV office.
              </li>
              <li>
                <a
                  href="https://dmv.ny.gov/records/get-my-own-driving-record-abstract"
                  target="_blank"
                  rel="noreferrer"
                  className="text-signal underline"
                >
                  NYS DMV — driving records <ExternalLink className="inline size-3" />
                </a>{" "}
                (the online option, when it&apos;s working)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
