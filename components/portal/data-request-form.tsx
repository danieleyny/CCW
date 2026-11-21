"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Check, FileDown, PencilLine, Trash2 } from "lucide-react"
import { submitDataRequest } from "@/app/portal/privacy/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

type RequestKind = "access" | "correction" | "deletion"

/**
 * Deliberately a two-step: pick, then confirm. Deletion is irreversible and
 * shouldn't be one click away from a mis-tap.
 */
interface OpenRequest {
  kind: RequestKind
  status: string
}

export function DataRequestForm({ openRequests = [] }: { openRequests?: OpenRequest[] }) {
  const router = useRouter()
  const { messages } = usePortalI18n()
  const t = messages.ui
  const kinds = [
    { key: "access" as const, label: t.sendCopy, icon: FileDown, hint: t.sendCopyHint },
    { key: "correction" as const, label: t.fixSomething, icon: PencilLine, hint: t.fixSomethingHint },
    { key: "deletion" as const, label: t.deleteData, icon: Trash2, hint: t.deleteDataHint },
  ]
  const [kind, setKind] = useState<RequestKind | null>(null)
  const [deletionConfirmed, setDeletionConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const selected = kinds.find((k) => k.key === kind)

  return (
    <div className="privacy-v2-request-form">
      <div className="privacy-v2-request-options" role="radiogroup" aria-label={t.askSomething}>
        {kinds.map((k) => {
          const Icon = k.icon
          const active = kind === k.key
          const existing = openRequests.find((request) => request.kind === k.key)
          return (
            <button
              key={k.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={Boolean(existing)}
              onClick={() => {
                setKind(active ? null : k.key)
                setDeletionConfirmed(false)
                setError(null)
              }}
              data-active={active}
              data-danger={k.key === "deletion"}
              className={cn(
                "privacy-v2-request-option",
                existing && "is-locked"
              )}
            >
              <span className="privacy-v2-request-icon"><Icon aria-hidden="true" /></span>
              <span><strong>{k.label}</strong><small>{k.hint}</small></span>
              {existing ? (
                <span className="privacy-v2-already">
                  <Check aria-hidden="true" />
                  {t.privacyAlreadyAsked.replace("{status}", requestStatus(existing.status, t))}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {selected && (
        <form
          action={(fd) =>
            start(async () => {
              setError(null)
              const res = await submitDataRequest(fd)
              if (res.error) setError(res.error)
              else {
                toast.success(t.requestFiled)
                setKind(null)
                setDeletionConfirmed(false)
                router.refresh()
              }
            })
          }
          className="privacy-v2-inline-form"
        >
          <input type="hidden" name="kind" value={selected.key} />
          <label htmlFor="privacy-request-detail">
            {selected.label} <span>· {t.requestDetailPlaceholder}</span>
          </label>
          <textarea
            id="privacy-request-detail"
            name="detail"
            rows={3}
            placeholder={t.requestDetailPlaceholder}
          />

          {selected.key === "deletion" ? (
            <div className="privacy-v2-deletion-confirm">
              <div className="privacy-v2-deletion-warning">
                <AlertTriangle aria-hidden="true" />
                <p>{t.privacyDeletionWarning} <a href="#privacy-deletion">{t.privacyDeletionRead}</a></p>
              </div>
              <label className="privacy-v2-check" htmlFor="privacy-delete-confirm">
                <input id="privacy-delete-confirm" type="checkbox" checked={deletionConfirmed} onChange={(event) => setDeletionConfirmed(event.target.checked)} />
                <span>{t.privacyDeletionCheck}</span>
              </label>
              <span id="privacy-delete-disabled" className="sr-only">{t.privacyDeletionDisabled}</span>
            </div>
          ) : null}

          {error ? <p className="privacy-v2-form-error" role="alert"><strong>{t.privacyNotSent}</strong><span>{error}</span></p> : null}

          <footer>
            <p>{t.privacyFollowUp}</p>
            <div>
              <Button type="button" variant="ghost" onClick={() => { setKind(null); setError(null); setDeletionConfirmed(false) }}>{t.privacyCancel}</Button>
              <span title={selected.key === "deletion" && !deletionConfirmed ? t.privacyDeletionDisabled : undefined}>
                <Button
                  type="submit"
                  disabled={pending || (selected.key === "deletion" && !deletionConfirmed)}
                  variant={selected.key === "deletion" ? "outline" : "default"}
                  className={selected.key === "deletion" ? "privacy-v2-delete-button" : undefined}
                  aria-describedby={selected.key === "deletion" && !deletionConfirmed ? "privacy-delete-disabled" : undefined}
                >
                  {pending ? t.filingRequest : selected.key === "deletion" ? t.privacySendDeletion : t.privacySendRequest}
                </Button>
              </span>
            </div>
          </footer>
        </form>
      )}
    </div>
  )
}

function requestStatus(status: string, t: Record<string, string>) {
  if (status === "acknowledged") return t.privacyStatusAcknowledged
  if (status === "fulfilled") return t.privacyStatusDone
  if (status === "refused") return t.privacyStatusNotDone
  return t.privacyStatusReceived
}
