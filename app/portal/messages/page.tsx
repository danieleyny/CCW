import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { sendMessage } from "@/app/portal/actions"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { Card, CardContent } from "@/components/ui/card"
import { getMessages } from "@/lib/i18n"

export const metadata = { title: "Messages" }

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
  const { data } = await supabase
    .from("messages")
    .select("id, body, created_at, profiles:sender_id(full_name, role)")
    .eq("case_id", myCase.id)
    .is("engagement_id", null) // staff thread only; instructor chat lives on the engagement
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
        <h1 className="text-2xl font-semibold tracking-tight">{t.ui.messagesTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.ui.messagesDescription}
        </p>
      </div>
      <Card>
        <CardContent className="p-5">
          <MessageThread
            caseId={myCase.id}
            messages={messages}
            send={sendMessage}
            placeholder={t.ui.messagePlaceholder}
          />
        </CardContent>
      </Card>
    </div>
  )
}
