"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { sendSafeguardInvite } from "@/app/portal/requirements/actions"
import { CopyLinkButton } from "@/components/portal/copy-link-button"
import { Button } from "@/components/ui/button"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"
import { SAFEGUARD_NOT_YOU_SHORT } from "@/lib/safeguard/self-designation"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface SafeguardInviteSnapshot {
  token: string | null
  status: string
  sentAt: string | null
  openedAt: string | null
  completedAt: string | null
}

function SafeguardTrack({ current, labels, ariaLabel }: { current: number; labels: string[]; ariaLabel: string }) {
  return (
    <ol className="mt-5 grid grid-cols-4" aria-label={ariaLabel}>
      {labels.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="relative min-w-0 text-center">
            {index > 0 ? <span className={cn("absolute left-0 top-2.5 h-px w-1/2", index <= current ? "bg-[var(--portal-gold)]" : "bg-hairline")} aria-hidden /> : null}
            {index < labels.length - 1 ? <span className={cn("absolute right-0 top-2.5 h-px w-1/2", index < current ? "bg-[var(--portal-gold)]" : "bg-hairline")} aria-hidden /> : null}
            <span className={cn(
              "relative z-10 mx-auto block size-5 rounded-full border-2 bg-white",
              done && "border-[var(--portal-gold)] bg-[var(--portal-gold)]",
              active && "border-[var(--portal-navy)] bg-[var(--portal-navy)] ring-4 ring-[var(--portal-navy)]/10",
              !done && !active && "border-hairline"
            )} aria-hidden />
            <span className={cn("mt-2 hidden truncate text-[11px] font-medium text-text-low sm:block", active && "text-foreground", !active && "max-sm:hidden")}>
              {label}
            </span>
            {active ? <span className="mt-2 block text-[11px] font-semibold text-foreground sm:hidden">{label}</span> : null}
          </li>
        )
      })}
    </ol>
  )
}

export function SafeguardInvite({
  caseId,
  person = { name: "", email: "", relationship: "" },
  initial,
}: {
  caseId?: string
  person?: { name: string; email: string; relationship: string }
  initial?: SafeguardInviteSnapshot | null
}) {
  const [pending, start] = useTransition()
  const [token, setToken] = useState<string | null>(initial?.token ?? null)
  const [sentTo, setSentTo] = useState<string | null>(person.email || null)
  const [sentLocally, setSentLocally] = useState(false)
  const router = useRouter()
  const { locale, messages } = usePortalI18n()
  const t = messages.ui

  const complete = !!initial?.completedAt || ["completed", "uploaded", "done"].includes(initial?.status ?? "")
  const opened = !complete && !!initial?.openedAt
  const sent = !complete && !opened && (!!initial?.sentAt || !!initial?.token || sentLocally)
  const current = complete ? 3 : opened ? 2 : sent ? 1 : 0
  const labels = [t.peopleSafeguardStepNotInvited, t.peopleSafeguardStepSent, t.openedLink, t.peopleSafeguardStepDone]
  const personReady = !!person.name.trim() && !!person.email.trim()

  function send() {
    start(async () => {
      const result = await sendSafeguardInvite(caseId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setToken(result.token ?? null)
      setSentTo(result.email ?? null)
      setSentLocally(true)
      toast.success(result.emailed ? t.peopleSafeguardSentToast : t.peopleSafeguardReadyToast, {
        description: result.email ?? undefined,
      })
      router.refresh()
    })
  }

  if (!personReady) {
    return (
      <section className="rounded-2xl border border-[var(--portal-navy)]/20 bg-[var(--portal-navy)] p-5 text-white shadow-[0_18px_45px_rgba(10,18,34,.16)] sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[var(--portal-gold-light)]">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="portal-title-font text-[24px] font-medium">{t.peopleSafeguardAddFirst}</h2>
            <p className="mt-2 text-[14px] leading-6 text-white/72">{t.peopleSafeguardAddFirstHint}</p>
            <Link href="/portal/details" className="mt-4 inline-flex min-h-10 items-center rounded-lg [background:var(--portal-gold-button)] px-4 text-[13px] font-semibold text-[var(--portal-navy)]">
              {t.peopleOpenDetails}
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const statusLabel = complete
    ? t.peopleSafeguardDone
    : opened
      ? t.openedLink
      : sent
        ? t.peopleSafeguardLinkSent
        : t.notInvited
  const sentence = complete
    ? initial?.completedAt
      ? `${t.peopleSafeguardCompleted} ${formatDate(initial.completedAt)}.`
      : t.peopleSafeguardCompleted
    : opened
      ? initial?.openedAt
        ? `${t.peopleSafeguardOpened} ${formatDate(initial.openedAt)}.`
        : t.peopleSafeguardOpened
      : sent
        ? initial?.sentAt
          ? `${t.peopleLinkSent} ${formatDate(initial.sentAt)}.`
          : t.peopleLinkSent
        : t.peopleNotInvitedSentence

  return (
    <article className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_14px_36px_rgba(10,18,34,.055)]">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--portal-navy)] text-[14px] font-bold text-white">
              {person.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-semibold text-foreground">{person.name}</h2>
              <p className="mt-0.5 truncate text-[12px] text-text-mid">{[person.relationship, person.email].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <span className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            complete ? "border-ok/25 bg-ok/10 text-ok" : opened ? "border-[var(--portal-navy)]/20 bg-[var(--portal-profile-blue)] text-[var(--portal-navy)]" : "border-[var(--portal-gold)]/30 bg-[var(--portal-gold)]/10 text-[var(--portal-gold-deep)]"
          )}>
            {statusLabel}
          </span>
        </div>

        <SafeguardTrack
          current={current}
          labels={labels}
          ariaLabel={t.peopleStepAria
            .replace("{current}", String(current + 1))
            .replace("{total}", String(labels.length))
            .replace("{label}", labels[current])}
        />

        <div className="mt-5 rounded-xl border border-[var(--portal-gold)]/20 bg-[var(--portal-gold)]/[0.055] p-3.5">
          <p className="text-[12px] font-semibold text-[var(--portal-navy)]">
            {locale === "es" ? t.peopleSafeguardNotYou : SAFEGUARD_NOT_YOU_SHORT}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-text-mid">{t.peopleSafeguardExplanation}</p>
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t border-hairline bg-[#FAFBFC] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-[13px] leading-5 text-text-mid">{sentence}</p>
        {!complete ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={send} disabled={pending} className={cn("min-h-9", !sent && !opened && "[background:var(--portal-gold-button)] text-[var(--portal-navy)]")}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sent || opened ? t.peopleResendLink : t.peopleSendThemLink}
            </Button>
            {(token || initial?.token) ? <CopyLinkButton token={(token ?? initial?.token)!} basePath="/g/" personName={person.name} /> : null}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ok">
            <CheckCircle2 className="size-4" aria-hidden /> {t.peopleSafeguardDone}
          </span>
        )}
      </footer>
      {sentTo ? <p className="sr-only">{t.peopleSentTo} {sentTo}</p> : null}
    </article>
  )
}
