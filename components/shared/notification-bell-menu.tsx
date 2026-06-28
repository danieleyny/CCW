"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  function onOpenChange(open: boolean) {
    if (open && unread > 0) {
      markAllNotificationsRead().then(() => router.refresh())
    }
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
          className="relative inline-flex size-9 items-center justify-center rounded-md text-text-mid transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-brass px-1 text-[10px] font-bold text-brand-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-hairline px-3 py-2 text-xs font-medium text-text-mid">
          Notifications
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
                    <Link href={n.link} className="block hover:bg-surface-2/60">
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
