"use client"

import Link from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"
import { Clock3, LockKeyhole, Scale, Send, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { calendarDayKey, formatCalendarDay, formatDateTime, formatTime, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"
import { TeamLogoAvatar } from "@/components/brand/team-logo-avatar"
import { UserAvatar } from "@/components/shared/user-avatar"
import { usePortalUserAvatar } from "@/components/portal/portal-user-avatar-provider"

export interface MessageRow {
  id: string
  body: string
  created_at: string
  read?: boolean
  senderName: string | null
  senderRole: string | null
}

interface MessageThreadProps {
  caseId: string
  messages: MessageRow[]
  send: (caseId: string, body: string) => Promise<void>
  placeholder?: string
  /** V3-P2.5 — canned starters inserted for editing, never auto-sent. */
  templates?: { label: string; body: string }[]
  /** Fired once on mount — marks the other party's messages read so the
   *  "unopened for an hour" nudge doesn't fire once you've seen the thread. */
  markRead?: () => Promise<void>
  /** Prefills an editable draft; changing it never sends a message. */
  draftSeed?: string
  variant?: "default" | "portal"
  replyBusinessDays?: number
  hasInstructor?: boolean
  loading?: boolean
}

/**
 * Shared client↔staff thread. The default variant remains the compact thread
 * used by staff, instructors, marketplace and concierge. The richer portal
 * variant is deliberately opt-in so those surfaces do not change.
 */
export function MessageThread(props: MessageThreadProps) {
  return props.variant === "portal" ? <PortalMessageThread {...props} /> : <DefaultMessageThread {...props} />
}

function useMarkReadOnce(markRead?: () => Promise<void>) {
  const marked = useRef(false)
  useEffect(() => {
    if (marked.current || !markRead) return
    marked.current = true
    markRead().catch(() => {})
  }, [markRead])
}

function DefaultMessageThread({
  caseId,
  messages,
  send,
  placeholder = "Write a message…",
  templates,
  markRead,
  draftSeed,
}: MessageThreadProps) {
  const { locale, messages: catalog } = usePortalI18n()
  const portalUser = usePortalUserAvatar()
  const t = catalog.ui
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState(draftSeed ?? "")
  useMarkReadOnce(markRead)

  function submit() {
    const body = value.trim()
    if (!body) return
    startTransition(async () => {
      try {
        await send(caseId, body)
        setValue("")
        ref.current?.focus()
      } catch {
        toast.error(t.sendError)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="space-y-3">
        {messages.length === 0 && <li className="text-sm text-muted-foreground">{t.noMessages}</li>}
        {messages.map((m) => {
          const isStaff = m.senderRole === "staff" || m.senderRole === "admin"
          const isClient = m.senderRole === "client"
          return (
            <li key={m.id} className="flex gap-3">
              {isClient && portalUser ? (
                <UserAvatar name={m.senderName ?? portalUser.fullName} avatar={portalUser.avatar} size={32} />
              ) : isStaff && !m.senderName ? (
                <TeamLogoAvatar size="sm" className="size-8" />
              ) : (
                <Avatar className="size-8">
                  <AvatarFallback className={cn("text-xs", isStaff ? "bg-signal-dim text-signal" : "bg-brass/15 text-brass-bright")}>
                    {initials(m.senderName ?? "?")}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{m.senderName ?? t.system}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(m.created_at, locale === "es" ? "es-US" : "en-US")}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{m.body}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-2">
        {templates && templates.length > 0 ? (
          <select
            aria-label={t.insertTemplate}
            className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-2 text-xs text-text-mid"
            value=""
            onChange={(event) => {
              const template = templates.find((item) => item.label === event.target.value)
              if (template) {
                setValue((current) => current.trim() ? `${current.trimEnd()}\n\n${template.body}` : template.body)
                ref.current?.focus()
              }
            }}
          >
            <option value="">{t.insertTemplateOption}</option>
            {templates.map((template) => <option key={template.label} value={template.label}>{template.label}</option>)}
          </select>
        ) : null}
        <Textarea
          ref={ref}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          rows={2}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit()
          }}
        />
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending || !value.trim()} size="sm">{t.send}</Button>
        </div>
      </div>
    </div>
  )
}

type DeliveryState = "sending" | "failed"
type TimelineMessage = MessageRow & { delivery?: DeliveryState }

function isTeamMessage(message: MessageRow) {
  return message.senderRole !== "client"
}

function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer nofollow" className="font-medium underline underline-offset-2">
        {part}
      </a>
    ) : part
  )
}

function PortalNote({ icon, title, body, href, linkLabel }: { icon: React.ReactNode; title: string; body: string; href?: string; linkLabel?: string }) {
  return (
    <section className="rounded-2xl border border-hairline bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--portal-profile-blue)] text-[var(--portal-navy)]">{icon}</span>
        <div>
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <p className="mt-1 text-[13px] leading-5 text-text-mid">{body}</p>
          {href && linkLabel ? <Link href={href} className="mt-2 inline-flex min-h-8 items-center text-[13px] font-semibold underline decoration-[var(--portal-gold)] decoration-2 underline-offset-4">{linkLabel}</Link> : null}
        </div>
      </div>
    </section>
  )
}

function PortalMessageThread({
  caseId,
  messages,
  send,
  placeholder = "Write a message…",
  markRead,
  draftSeed,
  replyBusinessDays,
  hasInstructor = false,
  loading = false,
}: MessageThreadProps) {
  const { locale, messages: catalog } = usePortalI18n()
  const portalUser = usePortalUserAvatar()
  const t = catalog.ui
  const localeCode = locale === "es" ? "es-US" : "en-US"
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(draftSeed ?? "")
  const [outgoing, setOutgoing] = useState<TimelineMessage | null>(null)
  const [newReplyCount, setNewReplyCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLOListElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef(new Map<string, HTMLLIElement>())
  const optimisticCounter = useRef(0)
  const didInitialScroll = useRef(false)
  const nearBottom = useRef(true)
  const previousIds = useRef(new Set(messages.map((message) => message.id)))
  useMarkReadOnce(markRead)

  const responseLine = replyBusinessDays
    ? interpolate(replyBusinessDays === 1 ? t.messagesReplyTargetOne : t.messagesReplyTargetMany, { days: replyBusinessDays })
    : t.messagesReplyFallback
  const responseSchedule = replyBusinessDays
    ? interpolate(replyBusinessDays === 1 ? t.messagesReplyScheduleOne : t.messagesReplyScheduleMany, { days: replyBusinessDays })
    : t.messagesReplyFallback

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "0px"
    textarea.style.height = `${Math.min(144, Math.max(44, textarea.scrollHeight))}px`
  }, [value])

  const firstUnreadTeamId = messages.find((message) => isTeamMessage(message) && message.read === false)?.id ?? null

  useEffect(() => {
    if (didInitialScroll.current) return
    didInitialScroll.current = true
    const target = firstUnreadTeamId ? messageRefs.current.get(firstUnreadTeamId) : bottomRef.current
    target?.scrollIntoView({ block: firstUnreadTeamId ? "center" : "end" })
  }, [firstUnreadTeamId])

  useEffect(() => {
    if (!didInitialScroll.current) return
    const nextIds = new Set(messages.map((message) => message.id))
    const newTeamMessages = messages.filter((message) => !previousIds.current.has(message.id) && isTeamMessage(message))
    previousIds.current = nextIds
    if (newTeamMessages.length === 0) return
    if (nearBottom.current) {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" })
    } else {
      setNewReplyCount((count) => count + newTeamMessages.length)
    }
  }, [messages])

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" })
    setNewReplyCount(0)
  }

  function sendBody(bodyInput?: string) {
    const body = (bodyInput ?? value).trim()
    if (!body || pending) return
    const optimistic: TimelineMessage = {
      id: `optimistic-${++optimisticCounter.current}`,
      body,
      created_at: new Date().toISOString(),
      read: false,
      senderName: portalUser?.fullName ?? null,
      senderRole: "client",
      delivery: "sending",
    }
    setOutgoing(optimistic)
    setValue("")
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }))
    startTransition(async () => {
      try {
        await send(caseId, body)
        setOutgoing(null)
        textareaRef.current?.focus()
      } catch {
        setOutgoing({ ...optimistic, delivery: "failed" })
        setValue(body)
        textareaRef.current?.focus()
      }
    })
  }

  const timeline: TimelineMessage[] = outgoing ? [...messages, outgoing] : messages
  const lastOwnId = !outgoing ? [...messages].reverse().find((message) => !isTeamMessage(message))?.id : null

  return (
    <section className="flex h-[calc(100svh-64px-var(--shell-bottom))] min-h-0 flex-col overflow-hidden bg-white md:h-[clamp(560px,calc(100vh-260px),820px)] md:rounded-[18px] md:border md:border-hairline md:shadow-[0_18px_50px_rgba(10,18,34,.07)]" aria-label={t.messagesConversationLabel}>
      <header className="flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogoAvatar className="size-10 shrink-0" />
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-foreground">{t.messagesTeamName}</h2>
            <p className="mt-0.5 truncate text-[12px] text-text-mid">{responseLine}</p>
          </div>
        </div>
        {hasInstructor ? (
          <Link href="/portal/marketplace" className="hidden min-h-9 shrink-0 items-center rounded-lg border border-hairline px-3 text-[12px] font-semibold text-[var(--portal-navy)] md:inline-flex xl:hidden">
            {t.messagesOpenTraining}
          </Link>
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1 bg-[#F8F7F3]">
        <ol
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label={t.messagesConversationLabel}
          onScroll={(event) => {
            const element = event.currentTarget
            nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 96
            if (nearBottom.current && newReplyCount) setNewReplyCount(0)
          }}
          className="h-full space-y-1 overflow-y-auto px-4 py-5 sm:px-5"
        >
          {loading ? (
            <li aria-label={t.messagesLoading} className="space-y-4">
              <div className="h-16 w-[72%] animate-pulse rounded-2xl bg-white" />
              <div className="ml-auto h-20 w-[66%] animate-pulse rounded-2xl bg-[var(--portal-navy)]/20" />
              <div className="h-12 w-[58%] animate-pulse rounded-2xl bg-white" />
            </li>
          ) : null}

          {!loading && timeline.length === 0 ? (
            <li className="grid min-h-[280px] place-items-center px-2 text-center">
              <div className="max-w-md">
                <TeamLogoAvatar className="mx-auto size-12" />
                <h3 className="portal-title-font mt-4 text-[25px] font-medium">{t.messagesEmptyTitle}</h3>
                <p className="mt-2 text-[14px] leading-6 text-text-mid">{responseLine}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {[t.messagesSuggestionDocument, t.messagesSuggestionNext, t.messagesSuggestionDetails].map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => { setValue(suggestion); textareaRef.current?.focus() }} className="min-h-9 rounded-full border border-hairline bg-white px-3 text-[12px] font-medium text-[var(--portal-navy)] transition hover:border-[var(--portal-gold)]">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ) : null}

          {!loading ? timeline.map((message, index) => {
            const previous = timeline[index - 1]
            const team = isTeamMessage(message)
            const messageDay = calendarDayKey(message.created_at)
            const showDay = !previous || calendarDayKey(previous.created_at) !== messageDay
            const grouped = !!previous
              && !showDay
              && isTeamMessage(previous) === team
              && previous.senderName === message.senderName
              && new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() <= 5 * 60 * 1000
            const time = formatTime(message.created_at, localeCode)
            const sender = team ? (message.senderName || t.messagesTeamFallback) : t.messagesYou
            const seen = message.id === lastOwnId && message.read === true
            const isFirstUnread = message.id === firstUnreadTeamId

            return (
              <li
                key={message.id}
                ref={(node) => { if (node) messageRefs.current.set(message.id, node); else messageRefs.current.delete(message.id) }}
                data-message-id={message.id}
                className={cn(index > 0 && !showDay && "pt-1")}
              >
                {showDay ? (
                  <div role="separator" className="flex items-center gap-3 py-4 text-center">
                    <span className="h-px flex-1 bg-hairline" />
                    <span className="rounded-full border border-hairline bg-white px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-text-low">
                      {formatCalendarDay(message.created_at, { locale: localeCode, today: t.messagesToday, yesterday: t.messagesYesterday })}
                    </span>
                    <span className="h-px flex-1 bg-hairline" />
                  </div>
                ) : null}
                {isFirstUnread ? (
                  <div role="separator" className="flex items-center gap-3 py-3 text-center">
                    <span className="h-px flex-1 bg-[var(--portal-gold)]/55" />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--portal-gold-deep)]">{t.messagesNewDivider}</span>
                    <span className="h-px flex-1 bg-[var(--portal-gold)]/55" />
                  </div>
                ) : null}
                <div className={cn("flex items-end gap-2", !team && "flex-row-reverse")}>
                  {grouped ? <span className="size-[30px] shrink-0" aria-hidden /> : team ? (
                    <TeamLogoAvatar size="sm" className="size-[30px] shrink-0" />
                  ) : portalUser ? (
                    <UserAvatar name={portalUser.fullName} avatar={portalUser.avatar} size={30} className="shrink-0" />
                  ) : (
                    <Avatar className="size-[30px] shrink-0"><AvatarFallback>{initials(message.senderName)}</AvatarFallback></Avatar>
                  )}
                  <div className={cn("max-w-[min(78%,620px)]", !team && "text-right")}>
                    {!grouped ? (
                      <p className={cn("mb-1 flex items-center gap-2 px-1 text-[11px] text-text-low", !team && "justify-end")}>
                        {team ? <><span className="font-medium text-text-mid">{sender}</span><span>{time}</span></> : <><span>{time}</span><span className="font-medium text-text-mid">{sender}</span></>}
                      </p>
                    ) : null}
                    <div
                      aria-label={`${sender}, ${time}: ${message.body}`}
                      className={cn(
                        "whitespace-pre-wrap break-words px-4 py-2.5 text-left text-[14px] leading-6 shadow-[0_5px_16px_rgba(10,18,34,.04)]",
                        team ? "rounded-[16px_16px_16px_4px] border border-hairline bg-white text-foreground" : "rounded-[16px_16px_4px_16px] bg-[var(--portal-navy)] text-white",
                        message.delivery === "sending" && "opacity-70"
                      )}
                    >
                      {linkify(message.body)}
                    </div>
                    {message.delivery === "sending" ? <p className="mt-1 px-1 text-[11px] text-text-low">{t.messagesSending}</p> : null}
                    {message.delivery === "failed" ? (
                      <p className="mt-1 rounded-lg bg-danger/[0.08] px-2 py-1.5 text-left text-[11px] text-danger">
                        {t.messagesNotSent} <button type="button" onClick={() => sendBody(message.body)} className="font-semibold underline underline-offset-2">{t.messagesTryAgain}</button>
                      </p>
                    ) : null}
                    {seen ? <p className="mt-1 px-1 text-[11px] text-text-low">{interpolate(t.messagesSeen, { time })}</p> : null}
                  </div>
                </div>
              </li>
            )
          }) : null}
          <li aria-hidden="true"><div ref={bottomRef} className="h-px" /></li>
        </ol>

        {newReplyCount > 0 ? (
          <button type="button" onClick={scrollToBottom} className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--portal-navy)] px-4 py-2 text-[12px] font-semibold text-white shadow-lg">
            {interpolate(newReplyCount === 1 ? t.messagesNewReplyOne : t.messagesNewReplyMany, { count: newReplyCount })}
          </button>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 shrink-0 border-t border-hairline bg-white px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-3 sm:px-4 md:pb-3">
        <div className="flex items-end gap-2 rounded-[14px] border border-hairline-strong bg-white p-1.5 shadow-[0_8px_24px_rgba(10,18,34,.06)] focus-within:border-[var(--portal-gold)]">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            rows={1}
            className="min-h-11 max-h-36 resize-none border-0 bg-transparent px-3 py-2.5 text-[16px] leading-6 shadow-none focus-visible:ring-0 md:text-[14px]"
            onKeyDown={(event) => {
              const phone = window.matchMedia("(max-width: 767px)").matches
              if (event.key === "Enter" && !event.shiftKey && !phone) {
                event.preventDefault()
                sendBody()
              }
            }}
          />
          <button type="button" onClick={() => sendBody()} disabled={pending || !value.trim()} aria-label={t.messagesSendAria} className="grid size-10 shrink-0 place-items-center rounded-xl [background:var(--portal-gold-button)] text-[var(--portal-navy)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45">
            <Send className="size-4" aria-hidden />
          </button>
        </div>
        <div className="mt-2 flex min-w-0 items-center justify-between gap-3 px-1">
          <span className="hidden text-[11px] text-text-low md:block">{t.messagesEnterHint}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-text-low md:text-right">{t.messagesSafetyHint}</span>
          <Sheet>
            <SheetTrigger asChild>
              <button type="button" className="shrink-0 text-[11px] font-semibold text-[var(--portal-navy)] underline md:hidden">{t.messagesMore}</button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[82svh] overflow-y-auto rounded-t-3xl bg-[#F8F7F3] p-0 pb-[env(safe-area-inset-bottom)]">
              <SheetHeader className="border-b border-hairline bg-white px-5 py-4 text-left">
                <SheetTitle className="portal-title-font text-[24px]">{t.messagesGuideTitle}</SheetTitle>
                <SheetDescription>{t.messagesGuideDescription}</SheetDescription>
              </SheetHeader>
              <div className="space-y-3 p-4">
                <PortalNote icon={<Clock3 className="size-4" aria-hidden />} title={t.messagesWhenWeReply} body={responseSchedule} />
                <PortalNote icon={<LockKeyhole className="size-4" aria-hidden />} title={t.messagesKeepSafe} body={t.messagesKeepSafeBody} />
                <PortalNote icon={<Scale className="size-4" aria-hidden />} title={t.messagesLegalQuestions} body={t.messagesLegalBody} />
                {hasInstructor ? <PortalNote icon={<UsersRound className="size-4" aria-hidden />} title={t.messagesInstructorTitle} body={t.messagesInstructorBody} href="/portal/marketplace" linkLabel={t.messagesOpenTraining} /> : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </section>
  )
}
