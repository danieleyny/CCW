import { createClient } from "@/lib/supabase/server"
import { NotificationBellMenu, type NotificationItem } from "./notification-bell-menu"

/** Server wrapper: loads the signed-in user's notifications (RLS-scoped). */
export async function NotificationBell() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read, created_at, kind")
    .order("created_at", { ascending: false })
    .limit(15)
  const items = (data ?? []) as NotificationItem[]
  const unread = items.filter((i) => !i.read).length
  return <NotificationBellMenu items={items} unread={unread} />
}
