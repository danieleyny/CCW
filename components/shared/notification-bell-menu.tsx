"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Bell,
  CalendarClock,
  FileText,
  Flag,
  MessageCircle,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { markAllNotificationsRead } from "./notification-actions"

export interface NotificationItem {
  id: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
  kind: string
}

type VisualKind = "message" | "document" | "fix" | "people" | "schedule" | "stage" | "default"

const VISUALS: Record<VisualKind, { icon: LucideIcon; label: string }> = {
  message: { icon: MessageCircle, label: "Message" },
  document: { icon: FileText, label: "Document" },
  fix: { icon: AlertCircle, label: "Needs attention" },
  people: { icon: Users, label: "People" },
  schedule: { icon: CalendarClock, label: "Schedule" },
  stage: { icon: Flag, label: "Milestone" },
  default: { icon: Bell, label: "Notification" },
}

function visualKind(item: NotificationItem): VisualKind {
  const content = `${item.title} ${item.body ?? ""}`.toLowerCase()
  if (/message|repl(?:y|ied)|concierge sent/.test(content)) return "message"
  if (/reference|household|cohabitant|affidavit/.test(content)) return "people"
  if (/needs? (?:a )?fix|reject|returned|sent back|missing|action required/.test(content)) return "fix"
  if (/document|file|upload|received|approved|signed/.test(content)) return "document"
  if (/call|training|session|appointment|calendar/.test(content) || ["booking", "reminder"].includes(item.kind)) return "schedule"
  if (/stage|milestone|status|enrolled|payment|license|decision|complete|recorded/.test(content)) return "stage"
  if (item.kind === "action_required") return "fix"
  if (item.kind === "offer") return "people"
  if (item.kind === "payment") return "stage"
  return "default"
}

function relativeTime(value: string, asOf: string) {
  const date = new Date(value)
  const elapsed = new Date(asOf).getTime() - date.getTime()
  if (Number.isNaN(elapsed)) return ""
  const minutes = Math.max(0, Math.floor(elapsed / 60_000))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

function isToday(value: string, asOf: string) {
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date(asOf).toDateString()
}

function NotificationRows({ items, close, asOf }: { items: NotificationItem[]; close: () => void; asOf: string }) {
  const groups = [
    { label: "Today", items: items.filter((item) => isToday(item.created_at, asOf)) },
    { label: "Earlier", items: items.filter((item) => !isToday(item.created_at, asOf)) },
  ].filter((group) => group.items.length)

  if (!items.length) {
    return (
      <div className="notification-empty">
        <span aria-hidden><Bell /></span>
        <h3>You&apos;re all caught up.</h3>
        <p>New case updates will appear here.</p>
      </div>
    )
  }

  return (
    <div className="notification-groups">
      {groups.map((group) => (
        <section key={group.label} className="notification-group" aria-labelledby={`notification-group-${group.label}`}>
          <h3 id={`notification-group-${group.label}`}>{group.label}</h3>
          <ul>
            {group.items.map((item) => {
              const kind = visualKind(item)
              const { icon: Icon, label } = VISUALS[kind]
              const content = (
                <div className="notification-row-inner">
                  <span className="notification-kind-icon" data-kind={kind} aria-label={label}><Icon /></span>
                  <span className="notification-row-copy">
                    <strong>{item.title}</strong>
                    {item.body ? <span>{item.body}</span> : null}
                    <time dateTime={item.created_at}>{relativeTime(item.created_at, asOf)}</time>
                  </span>
                  {!item.read ? <i className="notification-unread-dot" aria-label="Unread" /> : null}
                </div>
              )
              return (
                <li key={item.id} data-unread={item.read ? "false" : "true"}>
                  {item.link ? (
                    <Link href={item.link} onClick={close}>{content}</Link>
                  ) : content}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function NotificationBellMenu({ items, unread, asOf }: { items: NotificationItem[]; unread: number; asOf: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"all" | "unread">("all")
  const [openItems, setOpenItems] = useState(items)
  const [openUnread, setOpenUnread] = useState(unread)
  const swipeStart = useRef<number | null>(null)

  function onOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpenItems(items)
      setOpenUnread(unread)
      setTab("all")
    }
    setOpen(nextOpen)
    if (nextOpen && unread > 0) {
      markAllNotificationsRead().then(() => router.refresh())
    }
  }

  const visibleItems = tab === "unread" ? openItems.filter((item) => !item.read) : openItems

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          className="portal-notification-trigger relative inline-flex size-9 items-center justify-center rounded-md text-text-mid"
          data-open={open ? "true" : "false"}
        >
          <Bell className="size-5" aria-hidden />
          <span className="sr-only">Notifications{unread ? `, ${unread} unread` : ""}</span>
          {unread > 0 ? <span aria-hidden className="portal-notification-badge">{unread > 9 ? "9+" : unread}</span> : null}
        </button>
      </DialogTrigger>
      <DialogContent
        className="notification-panel"
        overlayClassName="notification-overlay supports-backdrop-filter:backdrop-blur-none"
        showCloseButton={false}
        onPointerDown={(event) => { swipeStart.current = event.clientY }}
        onPointerUp={(event) => {
          const start = swipeStart.current
          swipeStart.current = null
          if (start !== null && event.clientY - start > 72) setOpen(false)
        }}
      >
        <span className="notification-sheet-handle" aria-hidden />
        <header className="notification-panel-header">
          <span>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription className="sr-only">Recent account notifications</DialogDescription>
            {openUnread > 0 ? <b>{openUnread} new</b> : null}
          </span>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><X /></button>
        </header>

        <nav className="notification-tabs" aria-label="Filter notifications">
          <button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")}>All <span>{openItems.length}</span></button>
          <button type="button" aria-pressed={tab === "unread"} onClick={() => setTab("unread")}>Unread <span>{openUnread}</span></button>
        </nav>

        <div className="notification-scroll">
          <NotificationRows items={visibleItems} close={() => setOpen(false)} asOf={asOf} />
        </div>
        <footer className="notification-panel-footer">
          <span>You&apos;re seeing the latest 15 updates.</span>
          <Link href="/portal/messages" onClick={() => setOpen(false)}>Open messages</Link>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
