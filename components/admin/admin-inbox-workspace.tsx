"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check, CheckCircle2, ChevronLeft, CircleAlert, Play, Search, Send } from "lucide-react"
import { postMessage, markCaseMessagesRead } from "@/app/admin/actions"
import {
  loadInboxConversationPage,
  type InboxConversationPage,
  type InboxMessageRow,
} from "@/app/admin/inbox/actions"
import { trackEvent } from "@/lib/analytics"
import { inboxThreadMatchesTab, type InboxCounts, type InboxScope, type InboxTab, type InboxThread } from "@/lib/admin/inbox-model"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

const TABS: Array<{ key: InboxTab; label: string; count: keyof InboxCounts }> = [
  { key: "needs", label: "Needs reply", count: "needs" },
  { key: "unread", label: "Unread", count: "unread" },
  { key: "waiting", label: "Waiting on client", count: "waiting" },
  { key: "all", label: "All", count: "all" },
]

function relativeWait(value: string | null) {
  if (!value) return "Just now"
  const ms = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"}`
}

function waitedBucket(value: string | null) {
  if (!value) return "under_1_day"
  const days = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 86_400_000)
  if (days < 1) return "under_1_day"
  if (days <= 3) return "1_3_days"
  if (days <= 7) return "4_7_days"
  return "8_plus_days"
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Client"
}

function threadTag(thread: InboxThread) {
  if (thread.overdue && thread.needsReply) return "Reply overdue"
  if (thread.needsReply) return "Needs reply"
  return "Waiting on client"
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function dayLabel(value: string) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return "TODAY"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" }).toUpperCase()
}

function updateUrl(current: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(current.toString())
  for (const [key, value] of Object.entries(updates)) {
    if (!value) next.delete(key)
    else next.set(key, value)
  }
  const query = next.toString()
  return `/admin/inbox${query ? `?${query}` : ""}`
}

interface Props {
  threads: InboxThread[]
  counts: InboxCounts
  hidden: { test: number; duplicate: number }
  tab: InboxTab
  scope: InboxScope
  mode: "inbox" | "focus"
  showHidden: boolean
  query: string
  initialThreadId: string | null
  initialThreadExplicit: boolean
  initialConversation: InboxConversationPage | null
  staffName: string
}

interface SendAttempt {
  body: string
  status: "sending" | "failed"
}

export function AdminInboxWorkspace(props: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [threads, setThreads] = useState(props.threads)
  const [selectedId, setSelectedId] = useState(props.initialThreadId)
  const [mobileThreadOpen, setMobileThreadOpen] = useState(props.initialThreadExplicit)
  const [conversations, setConversations] = useState<Record<string, InboxConversationPage>>(() => props.initialThreadId && props.initialConversation ? { [props.initialThreadId]: props.initialConversation } : {})
  const [conversationLoading, setConversationLoading] = useState<string | null>(null)
  const [earlierPending, startEarlier] = useTransition()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [attempts, setAttempts] = useState<Record<string, SendAttempt | null>>({})
  const [search, setSearch] = useState(props.query)
  const [focusIds] = useState<string[]>(() => props.mode === "focus" ? props.threads.filter((thread) => thread.needsReply).map((thread) => thread.caseId) : [])
  const [focusIndex, setFocusIndex] = useState(0)
  const [repliedIds, setRepliedIds] = useState<string[]>([])
  const [skippedIds, setSkippedIds] = useState<string[]>([])
  const opened = useRef(new Set<string>())
  const searchRef = useRef<HTMLInputElement>(null)
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const completedTracked = useRef(false)

  const activeId = props.mode === "focus" ? focusIds[focusIndex] ?? null : selectedId
  const activeThread = threads.find((thread) => thread.caseId === activeId) ?? null
  const conversation = activeId ? conversations[activeId] ?? null : null
  const visibleThreads = useMemo(() => threads.filter((thread) => inboxThreadMatchesTab(thread, props.tab)), [props.tab, threads])

  const setThreadInUrl = useCallback((caseId: string | null) => {
    const next = new URL(window.location.href)
    if (caseId) next.searchParams.set("thread", caseId)
    else next.searchParams.delete("thread")
    window.history.replaceState(null, "", `${next.pathname}${next.search}`)
  }, [])

  const markOpened = useCallback(async (caseId: string) => {
    if (opened.current.has(caseId)) return
    opened.current.add(caseId)
    try {
      await markCaseMessagesRead(caseId)
      setThreads((current) => current.map((thread) => thread.caseId === caseId ? { ...thread, unread: 0, openedNotAnswered: thread.needsReply } : thread))
      setConversations((current) => {
        const page = current[caseId]
        if (!page) return current
        return { ...current, [caseId]: { ...page, messages: page.messages.map((message) => message.senderRole === "client" ? { ...message, read: true } : message) } }
      })
    } catch {
      opened.current.delete(caseId)
    }
  }, [])

  const ensureConversation = useCallback(async (caseId: string) => {
    if (conversations[caseId]) {
      await markOpened(caseId)
      return
    }
    setConversationLoading(caseId)
    try {
      const page = await loadInboxConversationPage({ caseId })
      setConversations((current) => ({ ...current, [caseId]: page }))
      await markOpened(caseId)
    } finally {
      setConversationLoading((current) => current === caseId ? null : current)
    }
  }, [conversations, markOpened])

  const openThread = useCallback((caseId: string) => {
    setSelectedId(caseId)
    setMobileThreadOpen(true)
    setThreadInUrl(caseId)
    void ensureConversation(caseId)
  }, [ensureConversation, setThreadInUrl])

  useEffect(() => {
    if (!activeId) return
    setThreadInUrl(activeId)
    const timer = window.setTimeout(() => void ensureConversation(activeId), 0)
    return () => window.clearTimeout(timer)
  }, [activeId, ensureConversation, setThreadInUrl])

  useEffect(() => {
    if (!conversation || earlierPending) return
    const frame = window.requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }))
    return () => window.cancelAnimationFrame(frame)
  }, [activeId, conversation, earlierPending])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search.trim() === props.query) return
      const next = new URLSearchParams(searchParams.toString())
      if (search.trim()) next.set("q", search.trim())
      else next.delete("q")
      next.delete("thread")
      router.replace(`${pathname}?${next.toString()}`)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [pathname, props.query, router, search, searchParams])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing = target?.matches("input, textarea, select, [contenteditable=true]")
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault(); searchRef.current?.focus(); return
      }
      if (event.key.toLowerCase() === "r" && !typing && activeId) {
        event.preventDefault(); replyRef.current?.focus(); return
      }
      if (typing || props.mode === "focus" || !["ArrowUp", "ArrowDown"].includes(event.key) || !visibleThreads.length) return
      event.preventDefault()
      const current = visibleThreads.findIndex((thread) => thread.caseId === activeId)
      const next = event.key === "ArrowDown" ? Math.min(visibleThreads.length - 1, Math.max(0, current + 1)) : Math.max(0, current < 0 ? 0 : current - 1)
      openThread(visibleThreads[next].caseId)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [activeId, openThread, props.mode, visibleThreads])

  useEffect(() => {
    const complete = props.mode === "focus" && focusIds.length > 0 && focusIndex >= focusIds.length
    if (!complete || completedTracked.current) return
    completedTracked.current = true
    trackEvent("admin_inbox_focus_completed", { replied: repliedIds.length, skipped: skippedIds.length })
  }, [focusIds.length, focusIndex, props.mode, repliedIds.length, skippedIds.length])

  function navigate(updates: Record<string, string | null>) {
    router.push(updateUrl(new URLSearchParams(searchParams.toString()), updates))
  }

  function setDraft(value: string) {
    if (!activeId) return
    setDrafts((current) => ({ ...current, [activeId]: value }))
  }

  async function sendReply(override?: string) {
    if (!activeThread || !activeId) return
    const body = (override ?? drafts[activeId] ?? "").trim()
    if (!body) return
    setAttempts((current) => ({ ...current, [activeId]: { body, status: "sending" } }))
    try {
      await postMessage(activeId, body)
      const createdAt = new Date().toISOString()
      const optimistic: InboxMessageRow = { id: `sent-${createdAt}`, body, read: true, createdAt, senderName: props.staffName, senderRole: "staff" }
      setConversations((current) => {
        const page = current[activeId]
        return page ? { ...current, [activeId]: { ...page, messages: [...page.messages, optimistic] } } : current
      })
      const updated = threads.map((thread) => thread.caseId === activeId ? {
        ...thread,
        lastBody: body,
        lastAt: createdAt,
        lastSender: "staff" as const,
        lastSenderName: props.staffName,
        waitingSince: null,
        firstUnansweredBody: null,
        needsReply: false,
        openedNotAnswered: false,
        overdue: false,
        dueAt: null,
        unread: 0,
        nextStep: thread.stageLabel,
      } : thread)
      setThreads(updated)
      setDrafts((current) => ({ ...current, [activeId]: "" }))
      setAttempts((current) => ({ ...current, [activeId]: null }))
      trackEvent("admin_inbox_reply_sent", { waited_bucket: waitedBucket(activeThread.waitingSince), from: props.mode === "focus" ? "focus" : "inbox" })
      if (props.mode === "focus") {
        setRepliedIds((current) => current.includes(activeId) ? current : [...current, activeId])
        setSkippedIds((current) => current.filter((id) => id !== activeId))
        setFocusIndex((current) => current + 1)
      } else {
        const remaining = updated.filter((thread) => inboxThreadMatchesTab(thread, props.tab))
        if (!remaining.some((thread) => thread.caseId === activeId)) {
          const next = remaining[0]?.caseId ?? null
          setSelectedId(next)
          setThreadInUrl(next)
          if (next) void ensureConversation(next)
        }
      }
      router.refresh()
    } catch {
      setAttempts((current) => ({ ...current, [activeId]: { body, status: "failed" } }))
    }
  }

  function loadEarlier() {
    if (!activeId || !conversation?.hasEarlier || !conversation.before) return
    startEarlier(async () => {
      const page = await loadInboxConversationPage({ caseId: activeId, before: conversation.before })
      setConversations((current) => {
        const existing = current[activeId]
        if (!existing) return current
        return {
          ...current,
          [activeId]: {
            messages: [...page.messages, ...existing.messages],
            uploads: [...page.uploads, ...existing.uploads],
            hasEarlier: page.hasEarlier,
            before: page.before,
          },
        }
      })
    })
  }

  if (props.mode === "focus") {
    const finished = focusIds.length === 0 || focusIndex >= focusIds.length
    return <FocusView
      thread={activeThread}
      conversation={conversation}
      loading={conversationLoading === activeId}
      attempt={activeId ? attempts[activeId] ?? null : null}
      draft={activeId ? drafts[activeId] ?? "" : ""}
      replyRef={replyRef}
      logRef={logRef}
      index={focusIndex}
      total={focusIds.length}
      overdue={focusIds.filter((id) => threads.find((thread) => thread.caseId === id)?.overdue).length}
      nextThreads={focusIds.slice(focusIndex + 1, focusIndex + 5).map((id) => threads.find((thread) => thread.caseId === id)).filter((thread): thread is InboxThread => !!thread)}
      finished={finished}
      replied={repliedIds.length}
      skipped={skippedIds.length}
      onDraft={setDraft}
      onSend={() => void sendReply()}
      onRetry={(body) => void sendReply(body)}
      onLoadEarlier={loadEarlier}
      earlierPending={earlierPending}
      onExit={() => navigate({ mode: null, thread: null })}
      onPrevious={() => setFocusIndex((index) => Math.max(0, index - 1))}
      onSkip={() => {
        if (activeId) {
          setSkippedIds((current) => current.includes(activeId) ? current : [...current, activeId])
          setRepliedIds((current) => current.filter((id) => id !== activeId))
        }
        setFocusIndex((index) => index + 1)
      }}
    />
  }

  const noReplies = props.tab === "needs" && visibleThreads.length === 0 && !props.query
  return <div className="min-w-0 space-y-5 overflow-x-hidden">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="font-display text-4xl tracking-tight text-[#101828]">Inbox</h1>
        <p className="mt-1 text-sm text-[#667085]">{props.counts.needs} conversations need a reply · {props.counts.overdue} overdue. Reply here without leaving the inbox.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {props.counts.needs > 0 && <button type="button" onClick={() => navigate({ mode: "focus", tab: "needs", thread: null })} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#14254A] px-4 text-sm font-semibold text-white hover:bg-[#0F1E3A]"><Play className="size-4 fill-current" />Focus · {props.counts.needs}</button>}
        <div className="inline-flex min-h-11 rounded-lg border border-black/10 bg-white p-1" aria-label="Inbox scope">
          {(["mine", "team", "unassigned"] as InboxScope[]).map((scope) => <button key={scope} type="button" onClick={() => navigate({ scope, thread: null })} aria-pressed={props.scope === scope} className={cn("min-h-9 rounded-md px-3 text-xs font-semibold capitalize text-[#667085]", props.scope === scope && "bg-[#14254A] text-white")}>{scope}</button>)}
        </div>
      </div>
    </header>

    <section className="grid min-h-[calc(100svh-200px)] min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_rgba(15,30,58,.06)] lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
      <div className={cn("min-w-0 border-r border-black/10", mobileThreadOpen && "hidden lg:block")}>
        <div className="border-b border-black/10 p-3">
          <label className="relative block"><span className="sr-only">Search conversations</span><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[#667085]" /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clients or messages…" className="min-h-11 w-full rounded-lg border border-black/10 bg-[#F9FAFB] pl-9 pr-3 text-sm outline-none focus:border-[#14254A]" /></label>
          <div className="admin-filter-scroll mt-3 flex min-w-0 gap-4 overflow-x-auto whitespace-nowrap border-b border-black/10" role="tablist" aria-label="Conversation filters">
            {TABS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={props.tab === item.key} onClick={() => navigate({ tab: item.key, thread: null })} className={cn("min-h-10 shrink-0 border-b-2 border-transparent text-xs font-semibold text-[#667085]", props.tab === item.key && "border-[#D9B25F] text-[#14254A]")}>{item.label} <span className="ml-1 rounded-full bg-[#EEF1F4] px-1.5 py-0.5 text-[10px]">{props.counts[item.count]}</span></button>)}
          </div>
          {(props.hidden.test + props.hidden.duplicate > 0) && <button type="button" onClick={() => navigate({ hidden: props.showHidden ? null : "1", thread: null })} className="mt-2 min-h-9 text-xs font-semibold text-[#667085] underline underline-offset-4">{props.showHidden ? "Hide test and duplicate cases" : `Show ${props.hidden.test + props.hidden.duplicate} hidden`}</button>}
        </div>

        {noReplies ? <div className="grid min-h-[430px] place-items-center p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#ECFDF3] text-[#027A48]"><Check className="size-6" /></span><h2 className="mt-4 font-display text-2xl">No one is waiting on a reply</h2><p className="mt-2 text-sm text-[#667085]">{props.counts.waiting} conversations are waiting on the client. New messages appear here and in Today.</p></div></div> : visibleThreads.length === 0 ? <div className="p-8 text-center text-sm text-[#667085]">No conversations match this view.</div> : <div role="listbox" aria-label="Client conversations" tabIndex={0} className="max-h-[calc(100svh-350px)] overflow-y-auto outline-none lg:max-h-[calc(100svh-276px)]">
          {visibleThreads.map((thread) => <ThreadRow key={thread.caseId} thread={thread} selected={thread.caseId === activeId} onOpen={() => openThread(thread.caseId)} />)}
        </div>}
        <p className="border-t border-black/10 p-3 text-[11px] leading-relaxed text-[#667085]">This inbox is the client lane only. Instructor messages stay in each case&apos;s Instructor lane.</p>
      </div>

      <div className={cn("min-w-0", !mobileThreadOpen && "hidden lg:block")}>
        {activeThread ? <Conversation
          thread={activeThread}
          conversation={conversation}
          loading={conversationLoading === activeId}
          attempt={activeId ? attempts[activeId] ?? null : null}
          draft={activeId ? drafts[activeId] ?? "" : ""}
          replyRef={replyRef}
          logRef={logRef}
          onBack={() => { setMobileThreadOpen(false); setThreadInUrl(null) }}
          onDraft={setDraft}
          onSend={() => void sendReply()}
          onRetry={(body) => void sendReply(body)}
          onLoadEarlier={loadEarlier}
          earlierPending={earlierPending}
        /> : <div className="grid min-h-[620px] place-items-center text-sm text-[#667085]">Pick a conversation</div>}
      </div>
    </section>
  </div>
}

function ThreadRow({ thread, selected, onOpen }: { thread: InboxThread; selected: boolean; onOpen: () => void }) {
  const tag = threadTag(thread)
  const preview = thread.lastSender === "client" ? thread.lastBody : `${thread.lastSenderName ? `${firstName(thread.lastSenderName)}: ` : "You: "}${thread.lastBody}`
  return <button type="button" role="option" aria-selected={selected} aria-label={`${thread.clientName}, ${tag}, waiting ${relativeWait(thread.waitingSince ?? thread.lastAt)}, ${thread.unread} unread`} onClick={onOpen} className={cn("grid min-h-[116px] w-full grid-cols-[36px_minmax(0,1fr)_auto] gap-3 border-b border-black/10 px-3 py-4 text-left hover:bg-[#F9FAFB]", selected ? "border-l-4 border-l-[#D9B25F] bg-[#FBF8EF] pl-2" : thread.overdue && thread.needsReply ? "border-l-4 border-l-[#D92D20] pl-2" : "border-l-4 border-l-transparent pl-2") }>
    <span className="grid size-9 place-items-center rounded-full bg-[#E7ECF4] text-xs font-bold text-[#14254A]">{initials(thread.clientName)}</span>
    <span className="min-w-0"><span className="flex items-center gap-2"><strong className="truncate text-sm text-[#101828]">{thread.clientName}</strong>{thread.unread > 0 && <span className="size-2 shrink-0 rounded-full bg-[#0E9384]" aria-label="Unread" />}</span><span className={cn("mt-1 block overflow-hidden text-ellipsis text-sm leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]", thread.unread > 0 ? "font-medium text-[#344054]" : "text-[#667085]")}>{preview}</span><span className="mt-2 block truncate font-mono text-[10px] tracking-wide text-[#667085]">{thread.trackLabel} · {thread.stageLabel.toUpperCase()}</span></span>
    <span className="flex min-w-[88px] flex-col items-end gap-1"><span className="text-[11px] text-[#667085]">{relativeWait(thread.waitingSince ?? thread.lastAt)}</span><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", tag === "Reply overdue" ? "bg-[#FEE4E2] text-[#B42318]" : tag === "Needs reply" ? "bg-[#FEF0C7] text-[#93370D]" : "bg-[#F2F4F7] text-[#475467]")}>{tag}</span>{thread.unread > 0 && <span className="text-[10px] font-semibold text-[#0E9384]">{thread.unread} unread</span>}{thread.unassigned && <span className="text-[10px] font-semibold text-[#667085]">Unassigned</span>}</span>
  </button>
}

interface ConversationProps {
  thread: InboxThread
  conversation: InboxConversationPage | null
  loading: boolean
  attempt: SendAttempt | null
  draft: string
  replyRef: React.RefObject<HTMLTextAreaElement | null>
  logRef: React.RefObject<HTMLDivElement | null>
  onBack?: () => void
  onDraft: (value: string) => void
  onSend: () => void
  onRetry: (body: string) => void
  onLoadEarlier: () => void
  earlierPending: boolean
  focus?: boolean
}

function Conversation({
  thread,
  conversation,
  loading,
  attempt,
  draft,
  replyRef,
  logRef,
  onBack,
  onDraft,
  onSend,
  onRetry,
  onLoadEarlier,
  earlierPending,
  focus,
}: ConversationProps) {
  const timeline = useMemo(() => {
    const items = [
      ...(conversation?.messages ?? []).map((message) => ({ kind: "message" as const, at: message.createdAt, message })),
      ...(conversation?.uploads ?? []).map((upload) => ({ kind: "upload" as const, at: upload.createdAt, upload })),
    ]
    return items.sort((a, b) => a.at.localeCompare(b.at))
  }, [conversation])
  const lastMessageId = conversation?.messages.at(-1)?.id

  return <div className="flex min-h-[calc(100svh-200px)] min-w-0 flex-col bg-white lg:h-[calc(100svh-200px)] lg:min-h-[640px]">
    <header className="border-b border-black/10 p-3 sm:p-4">
      {onBack && <button type="button" onClick={onBack} className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[#14254A] lg:hidden"><ChevronLeft className="size-4" />Inbox</button>}
      <div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#E7ECF4] text-sm font-bold text-[#14254A]">{initials(thread.clientName)}</span><div className="min-w-0 flex-1"><h2 className="truncate font-display text-2xl text-[#101828]">{thread.clientName}</h2><p className="truncate font-mono text-[10px] tracking-wide text-[#667085]">{thread.trackLabel} · {thread.serviceLabel}</p></div><Link href={`/admin/cases/${thread.caseId}?tab=messages`} className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-black/10 px-3 text-xs font-semibold text-[#14254A] hover:bg-[#F9FAFB]"><span className="hidden sm:inline">Open </span>case →</Link></div>
    </header>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 bg-[#F2F4F7] px-4 py-3 text-xs text-[#475467]"><span>{thread.stageLabel} · {thread.serviceLabel}</span><span>Owner {thread.ownerName ?? "Unassigned"}</span><strong className="ml-auto text-[#14254A]">Next: {thread.nextStep}</strong></div>
    <div ref={logRef} role="log" aria-live="polite" aria-label={`Messages with ${thread.clientName}`} className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6">
      {loading ? <ConversationSkeleton /> : <>
        {conversation?.hasEarlier && <div className="mb-5 text-center"><button type="button" onClick={onLoadEarlier} disabled={earlierPending} className="min-h-11 rounded-lg border border-black/10 px-4 text-xs font-semibold text-[#475467] hover:bg-[#F9FAFB] disabled:opacity-60">{earlierPending ? "Loading…" : "Load earlier"}</button></div>}
        {timeline.length === 0 && <p className="py-12 text-center text-sm text-[#667085]">No messages yet.</p>}
        {timeline.map((item, index) => {
          const day = new Date(item.at).toDateString()
          const previousDay = index > 0 ? new Date(timeline[index - 1].at).toDateString() : ""
          const separator = day !== previousDay
          if (item.kind === "upload") return <div key={`upload-${item.upload.id}`}>{separator && <DaySeparator label={dayLabel(item.at)} />}<div className="my-4 text-center"><span className="inline-flex max-w-full rounded-full bg-[#F2F4F7] px-3 py-1.5 text-[11px] text-[#475467]">{thread.clientFirstName} uploaded {item.upload.fileName} to {item.upload.documentType}</span></div></div>
          const message = item.message
          const client = message.senderRole === "client"
          const opened = message.id === lastMessageId && client && message.read && thread.needsReply
          return <div key={message.id}>{separator && <DaySeparator label={dayLabel(item.at)} />}<div className={cn("mb-4 flex", client ? "justify-start" : "justify-end")}><div className="max-w-[82%]"><p className={cn("mb-1 text-[11px] text-[#667085]", !client && "text-right")}>{client ? thread.clientFirstName : firstName(message.senderName)} · {formatMessageTime(message.createdAt)}</p><div className={cn("rounded-2xl px-4 py-3 text-sm leading-relaxed", client ? "rounded-bl-md bg-[#E9F4FB] text-[#182230]" : "rounded-br-md bg-[#14254A] text-white")}>{message.body}</div>{opened && <p className="mt-1 text-[11px] text-[#667085]">Opened, not answered</p>}</div></div></div>
        })}
        {attempt && <div className="mb-4 flex justify-end"><div className="max-w-[82%] opacity-60"><p className="mb-1 text-right text-[11px] text-[#667085]">{attempt.status === "sending" ? "Sending · sending…" : "Not sent · not sent"}</p><div className="rounded-2xl rounded-br-md bg-[#14254A] px-4 py-3 text-sm leading-relaxed text-white">{attempt.body}</div>{attempt.status === "failed" && <p className="mt-2 rounded-lg bg-[#FEF3F2] p-2 text-xs text-[#B42318]">Didn&apos;t send. Your reply is saved here. <button type="button" onClick={() => onRetry(attempt.body)} className="font-bold underline">Try again</button></p>}</div></div>}
      </>}
    </div>
    <Composer thread={thread} draft={draft} attempt={attempt} replyRef={replyRef} onDraft={onDraft} onSend={onSend} focus={focus} />
  </div>
}

function Composer({ thread, draft, attempt, replyRef, onDraft, onSend, focus }: { thread: InboxThread; draft: string; attempt: SendAttempt | null; replyRef: React.RefObject<HTMLTextAreaElement | null>; onDraft: (value: string) => void; onSend: () => void; focus?: boolean }) {
  function resize(element: HTMLTextAreaElement) {
    element.style.height = "auto"
    element.style.height = `${Math.min(element.scrollHeight, 192)}px`
  }
  return <div className="sticky bottom-[calc(66px+env(safe-area-inset-bottom))] z-10 border-t border-black/10 bg-white p-3 shadow-[0_-10px_30px_rgba(15,30,58,.06)] lg:static lg:bottom-auto lg:p-4 lg:shadow-none">
    <label htmlFor={`reply-${thread.caseId}`} className="mb-2 block text-xs font-semibold text-[#344054]">Reply to {thread.clientFirstName}</label>
    <div className="flex items-end gap-2"><textarea id={`reply-${thread.caseId}`} ref={replyRef} value={draft} rows={2} placeholder={`Reply to ${thread.clientFirstName}…`} onChange={(event) => { onDraft(event.target.value); resize(event.target) }} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); onSend() } }} className="max-h-48 min-h-[52px] min-w-0 flex-1 resize-none rounded-xl border border-black/10 bg-[#F9FAFB] px-3 py-2 text-sm outline-none focus:border-[#14254A]" /><button type="button" onClick={onSend} disabled={!draft.trim() || attempt?.status === "sending"} className="inline-flex min-h-[52px] shrink-0 items-center gap-2 rounded-xl bg-[#14254A] px-4 text-sm font-semibold text-white hover:bg-[#0F1E3A] disabled:opacity-50"><Send className="size-4" /><span className="hidden sm:inline">{focus ? "Send & next →" : "Send"}</span></button></div>
    <p className="mt-1 text-[11px] text-[#667085]">Client sees this in their portal</p><p className="sr-only" aria-live="polite">{attempt?.status === "sending" ? "Sending reply" : attempt?.status === "failed" ? "Reply failed to send" : ""}</p>
  </div>
}

function DaySeparator({ label }: { label: string }) {
  return <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-black/10" /><span className="font-mono text-[10px] tracking-[.14em] text-[#667085]">{label}</span><span className="h-px flex-1 bg-black/10" /></div>
}

function ConversationSkeleton() {
  return <div className="animate-pulse space-y-5 motion-reduce:animate-none"><div className="h-16 w-2/3 rounded-2xl bg-black/5" /><div className="ml-auto h-20 w-3/5 rounded-2xl bg-black/5" /><div className="h-24 w-3/4 rounded-2xl bg-black/5" /></div>
}

interface FocusProps extends Omit<ConversationProps, "onBack" | "focus" | "thread"> {
  thread: InboxThread | null
  index: number
  total: number
  overdue: number
  nextThreads: InboxThread[]
  finished: boolean
  replied: number
  skipped: number
  onExit: () => void
  onPrevious: () => void
  onSkip: () => void
}

function FocusView({
  thread,
  conversation,
  loading,
  attempt,
  draft,
  replyRef,
  logRef,
  onDraft,
  onSend,
  onRetry,
  onLoadEarlier,
  earlierPending,
  index,
  total,
  overdue,
  nextThreads,
  finished,
  replied,
  skipped,
  onExit,
  onPrevious,
  onSkip,
}: FocusProps) {
  if (finished) return <div className="mx-auto grid min-h-[70svh] max-w-3xl place-items-center px-4 text-center"><div><span className="mx-auto grid size-16 place-items-center rounded-full bg-[#ECFDF3] text-[#027A48]"><CheckCircle2 className="size-8" /></span><p className="mt-6 font-mono text-xs uppercase tracking-[.18em] text-[#667085]">Work / Inbox · Focus</p><h1 className="mt-3 font-display text-4xl">All caught up</h1><p className="mt-2 text-[#667085]">{replied} replied, {skipped} skipped</p><button type="button" onClick={onExit} className="mt-7 min-h-11 rounded-lg bg-[#14254A] px-5 text-sm font-semibold text-white">Back to inbox</button></div></div>
  if (!thread) return <div className="mx-auto max-w-3xl rounded-2xl border border-[#FDA29B] bg-[#FEF3F2] p-8 text-center"><CircleAlert className="mx-auto size-8 text-[#B42318]" /><h1 className="mt-3 font-display text-3xl">This conversation is unavailable.</h1><button type="button" onClick={onSkip} className="mt-5 min-h-11 rounded-lg bg-[#14254A] px-5 text-sm font-semibold text-white">Skip</button></div>
  return <div className="mx-auto min-w-0 max-w-[1000px] space-y-4 pb-24 lg:pb-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-xs uppercase tracking-[.16em] text-[#667085]">Work / Inbox · Focus</p><button type="button" onClick={onExit} className="min-h-11 rounded-lg border border-black/10 bg-white px-4 text-sm font-semibold text-[#14254A]">Exit focus</button></div>
    <div className="rounded-2xl border border-black/10 bg-white p-4"><div className="flex items-center justify-between gap-3 text-sm"><strong>{index + 1} of {total}</strong><span className="text-[#667085]">Oldest first · {overdue} overdue</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EEF1F4]"><div className="h-full rounded-full bg-[#D9B25F] transition-[width] motion-reduce:transition-none" style={{ width: `${Math.max(4, ((index + 1) / Math.max(1, total)) * 100)}%` }} /></div></div>
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_45px_rgba(15,30,58,.08)]"><Conversation thread={thread} conversation={conversation} loading={loading} attempt={attempt} draft={draft} replyRef={replyRef} logRef={logRef} onDraft={onDraft} onSend={onSend} onRetry={onRetry} onLoadEarlier={onLoadEarlier} earlierPending={earlierPending} focus /></div>
    <div className="flex items-center justify-between gap-3"><button type="button" onClick={onPrevious} disabled={index === 0} className="min-h-11 rounded-lg border border-black/10 bg-white px-4 text-sm font-semibold disabled:opacity-40">← Previous</button><p className="hidden text-xs text-[#667085] sm:block">Skip leaves it in Needs reply. Opening a conversation marks it read.</p><button type="button" onClick={onSkip} className="min-h-11 rounded-lg border border-black/10 bg-white px-4 text-sm font-semibold">Skip →</button></div>
    {nextThreads.length > 0 && <section className="rounded-2xl border border-black/10 bg-white p-4"><h2 className="font-mono text-[10px] uppercase tracking-[.16em] text-[#667085]">Up next</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{nextThreads.map((next) => <div key={next.caseId} className="min-w-0 rounded-xl bg-[#F9FAFB] p-3"><strong className="block truncate text-sm">{next.clientName}</strong><q className="mt-1 block truncate text-xs text-[#667085]">{next.lastBody}</q><span className="mt-2 block font-mono text-[10px] text-[#667085]">{relativeWait(next.waitingSince)}</span></div>)}</div></section>}
  </div>
}
