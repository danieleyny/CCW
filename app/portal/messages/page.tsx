import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { sendMessage } from "@/app/portal/actions"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "Messages" }

export default async function MessagesPage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from("messages")
    .select("id, body, created_at, profiles:sender_id(full_name, role)")
    .eq("case_id", myCase.id)
    .order("created_at")

  const messages: MessageRow[] = (data ?? []).map((m) => {
    const p = m.profiles as unknown as { full_name: string; role: string } | null
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      senderName: p?.full_name ?? null,
      senderRole: p?.role ?? null,
    }
  })

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Questions? Message your CARRY specialist any time.
        </p>
      </div>
      <Card>
        <CardContent className="p-5">
          <MessageThread
            caseId={myCase.id}
            messages={messages}
            send={sendMessage}
            placeholder="Message your specialist…"
          />
        </CardContent>
      </Card>
    </div>
  )
}
