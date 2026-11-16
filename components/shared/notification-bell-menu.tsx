"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { markAllNotificationsRead } from "./notification-actions"
import { cn } from "@/lib/utils"

export interface NotificationItem {
  id: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
  kind: string
}

export function NotificationBellMenu({
  items,
  unread,
}: {
  items: NotificationItem[]
  unread: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen && unread > 0) {
      markAllNotificationsRead().then(() => router.refresh())
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          className="portal-notification-trigger relative inline-flex size-9 items-center justify-center rounded-md text-text-mid transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="size-5" aria-hidden />
          <span className="sr-only">
            Notifications{unread ? `, ${unread} unread` : ""}
          </span>
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-brass px-1 text-[10px] font-bold text-brand-foreground"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="top-[calc(env(safe-area-inset-top)+72px)] right-3 bottom-auto left-auto max-h-[min(32rem,calc(100dvh-88px))] w-[min(20rem,calc(100vw-1.5rem))] max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden p-0 sm:right-6">
        <div className="border-b border-hairline px-3 py-3 pr-12">
          <DialogTitle className="text-xs font-medium text-text-mid">Notifications</DialogTitle>
          <DialogDescription className="sr-only">Recent account notifications</DialogDescription>
        </div>
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-text-low">You&apos;re all caught up.</p>
        ) : (
          <ul className="max-h-96 overflow-auto">
            {items.map((n) => {
              const inner = (
                <div className={cn("px-3 py-2.5", !n.read && "bg-signal-dim/40")}>
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && <div className="mt-0.5 text-xs text-text-mid">{n.body}</div>}
                </div>
              )
              return (
                <li key={n.id} className="border-b border-hairline last:border-0">
                  {n.link ? (
                    <Link href={n.link} className="block hover:bg-surface-2/60" onClick={() => setOpen(false)}>
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
