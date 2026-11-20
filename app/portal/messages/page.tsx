import Link from "next/link"
import { Clock3, LockKeyhole, Scale, UsersRound } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { sendMessage } from "@/app/portal/actions"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { getMessages } from "@/lib/i18n"
import { MESSAGE_REPLY_BUSINESS_DAYS } from "@/config/service-targets"

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template)
}

export async function generateMetadata() {
  const t = await getMessages()
  return { title: t.ui.messagesTitle }
}

function GuideCard({
  icon,
  title,
  body,
  href,
  linkLabel,
}: {
  icon: React.ReactNode
  title: string
  body: string
  href?: string
  linkLabel?: string
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-4 shadow-[0_12px_30px_rgba(10,18,34,.04)]">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--portal-profile-blue)] text-[var(--portal-navy)]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-[13px] leading-5 text-text-mid">{body}</p>
          {href && linkLabel ? (
            <Link href={href} className="mt-2 inline-flex min-h-8 items-center text-[13px] font-semibold text-[var(--portal-navy)] underline decoration-[var(--portal-gold)] decoration-2 underline-offset-4">
              {linkLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function GuideCards({
  t,
  hasInstructor,
  tablet = false,
}: {
  t: Record<string, string>
  hasInstructor: boolean
  tablet?: boolean
}) {
  const responseDays = fill(
    MESSAGE_REPLY_BUSINESS_DAYS === 1 ? t.messagesReplyScheduleOne : t.messagesReplyScheduleMany,
    { days: MESSAGE_REPLY_BUSINESS_DAYS }
  )

  return (
    <div className={tablet ? "grid gap-3 md:grid-cols-3" : "space-y-3"}>
      <GuideCard icon={<Clock3 className="size-4" aria-hidden />} title={t.messagesWhenWeReply} body={responseDays} />
      <GuideCard icon={<LockKeyhole className="size-4" aria-hidden />} title={t.messagesKeepSafe} body={t.messagesKeepSafeBody} />
      <GuideCard icon={<Scale className="size-4" aria-hidden />} title={t.messagesLegalQuestions} body={t.messagesLegalBody} />
      {!tablet && hasInstructor ? (
        <GuideCard
          icon={<UsersRound className="size-4" aria-hidden />}
          title={t.messagesInstructorTitle}
          body={t.messagesInstructorBody}
          href="/portal/marketplace"
          linkLabel={t.messagesOpenTraining}
        />
      ) : null}
    </div>
  )
}

export default async function MessagesPage() {
  const [myCase, t] = await Promise.all([getMyCase(), getMessages()])
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        {t.common.noCase}
      </p>
    )
  }

  const supabase = await createClient()
  const [{ data }, { data: engagement }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, body, created_at, read, profiles:sender_id(full_name, role)")
      .eq("case_id", myCase.id)
      .is("engagement_id", null) // staff thread only; instructor chat lives on the engagement
      .order("created_at"),
    supabase
      .from("engagements")
      .select("id")
      .eq("case_id", myCase.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ])

  const messages: MessageRow[] = (data ?? []).map((m) => {
    const p = m.profiles as unknown as { full_name: string; role: string } | null
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      read: m.read,
      senderName: p?.full_name ?? null,
      senderRole: p?.role ?? null,
    }
  })
  const hasInstructor = !!engagement

  return (
    <div className="-mx-4 -mt-8 md:mx-0 md:mt-0">
      <header className="mb-6 hidden border-b border-hairline pb-6 md:block">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--portal-gold-deep)]">{t.ui.messagesEyebrow}</p>
        <h1 className="portal-title-font mt-1 text-[36px] font-medium leading-tight text-foreground">{t.ui.messagesHeading}</h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-6 text-text-mid">{t.ui.messagesLede}</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <MessageThread
            caseId={myCase.id}
            messages={messages}
            send={sendMessage}
            placeholder={t.ui.messagePlaceholder}
            variant="portal"
            replyBusinessDays={MESSAGE_REPLY_BUSINESS_DAYS}
            hasInstructor={hasInstructor}
          />

          <div className="mt-4 hidden md:block xl:hidden">
            <GuideCards t={t.ui} hasInstructor={hasInstructor} tablet />
          </div>
        </div>

        <aside className="hidden xl:block" aria-label={t.ui.messagesGuideTitle}>
          <GuideCards t={t.ui} hasInstructor={hasInstructor} />
        </aside>
      </div>
    </div>
  )
}
