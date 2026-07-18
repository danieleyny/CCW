"use client"

import { useState } from "react"
import { Download, FileText, Sparkles, Upload as UploadIcon } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import { RequirementAction, type GeneratedDoc } from "@/components/portal/requirement-action"
import { actionFor } from "@/lib/requirements/actions"
import { cn } from "@/lib/utils"

export interface LibraryFile {
  id: string
  name: string
  url: string | null
  createdAt: string
  status: string
  /** We prepared it (vs the applicant uploaded it) — worth saying out loud. */
  generated: boolean
  /** Generated + unsigned = a draft, not a document they can file. */
  signedAt: string | null
}

export interface LibraryEntry {
  reqCode: string
  title: string
  officialTitle: string
  status: string
  files: LibraryFile[]
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

function FileRow({ file }: { file: LibraryFile }) {
  const draft = file.generated && !file.signedAt
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-hairline bg-surface-2/40 px-3 py-2">
      <FileText className="size-3.5 shrink-0 text-text-low" />
      <span className="min-w-0 flex-1 truncate text-xs">{file.name}</span>

      <span
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
          file.generated ? "bg-brass/15 text-brass-bright" : "bg-surface-3 text-text-mid"
        )}
      >
        {file.generated ? <Sparkles className="size-3" /> : <UploadIcon className="size-3" />}
        {file.generated ? "Prepared for you" : "Uploaded by you"}
      </span>

      {draft && (
        <span className="rounded bg-brass/15 px-1.5 py-0.5 text-[10px] font-medium text-brass-bright">
          draft — unsigned
        </span>
      )}
      <span className="text-[10px] text-text-low">{fmt(file.createdAt)}</span>
      <StatusBadge status={file.status} />
      {file.url && (
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-signal underline"
        >
          <Download className="size-3.5" /> {draft ? "Read draft" : "Download"}
        </a>
      )}
    </div>
  )
}

/**
 * ONE library, both halves driven by the SAME requirement→action config the
 * checklist reads. The two pages used to be built from different lists — a
 * curated set of upload slots here, the requirements engine there — so they
 * could and did disagree about what was outstanding. Now they can't.
 *
 * Checklist = the journey (what's left, in order). Documents = the files.
 */
export function DocumentLibrary({
  needed,
  completed,
  loose,
  caseId,
  clientId,
  prefills,
  generated,
  signatureOnFile,
}: {
  needed: LibraryEntry[]
  completed: LibraryEntry[]
  /** Files not tied to a requirement — court request letters, worksheets. */
  loose: LibraryFile[]
  caseId: string
  clientId: string
  prefills: Record<string, Record<string, unknown>>
  generated: Record<string, GeneratedDoc>
  signatureOnFile: string | null
}) {
  const [showCompleted, setShowCompleted] = useState(true)

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold tracking-tight">
          Still needed <span className="text-text-low">({needed.length})</span>
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Everything we don&apos;t have yet — documents to upload, and the ones we prepare for you.
        </p>

        {needed.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Nothing outstanding. Every document is in.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-lg border bg-card">
            {needed.map((e) => (
              <li key={e.reqCode} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{e.title}</div>
                    <p className="mt-1 font-mono text-[10px] text-text-low">
                      {e.reqCode} · {e.officialTitle}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>

                {e.files.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {e.files.map((f) => (
                      <FileRow key={f.id} file={f} />
                    ))}
                  </div>
                )}

                <RequirementAction
                  reqCode={e.reqCode}
                  status={e.status}
                  caseId={caseId}
                  clientId={clientId}
                  prefill={prefills[e.reqCode] ?? {}}
                  generated={generated[e.reqCode] ?? null}
                  signatureOnFile={signatureOnFile}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setShowCompleted((v) => !v)}
          aria-expanded={showCompleted}
          className="text-sm font-semibold tracking-tight hover:text-brass-bright"
        >
          Completed <span className="text-text-low">({completed.length})</span>
        </button>

        {showCompleted &&
          (completed.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Nothing filed away yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y rounded-lg border bg-card">
              {completed.map((e) => (
                <li key={e.reqCode} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{e.title}</div>
                      <p className="mt-1 font-mono text-[10px] text-text-low">
                        {e.reqCode} · {e.officialTitle}
                      </p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  {e.files.map((f) => (
                    <FileRow key={f.id} file={f} />
                  ))}
                  {e.files.length === 0 && (
                    <p className="text-xs text-text-low">
                      {actionFor(e.reqCode)?.mode === "attest"
                        ? "Confirmed on platform — no file needed."
                        : "Completed — no file attached."}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ))}
      </section>

      {loose.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold tracking-tight">
            Other files <span className="text-text-low">({loose.length})</span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Documents we prepared to help you — request letters and worksheets. They aren&apos;t
            requirements themselves.
          </p>
          <div className="mt-3 space-y-1.5">
            {loose.map((f) => (
              <FileRow key={f.id} file={f} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
