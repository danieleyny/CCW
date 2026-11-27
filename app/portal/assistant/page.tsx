import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { Bot, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { hasPaidPackage } from "@/lib/packages"
import { isFirearmAppHost } from "@/lib/firearm-site"
import { FIREARM_ASSISTANT_ENABLED } from "@/lib/ai/firearm-assistant"
import { FirearmAiAssistant } from "@/components/portal/firearm-ai-assistant"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "Licensing assistant" }

export default async function PortalAssistantPage() {
  await requireRole(["client"])
  if (!isFirearmAppHost((await headers()).get("host"))) notFound()
  const myCase = await getMyCase()
  const supabase = await createClient()
  const paid = myCase ? await Promise.all([
    hasPaidPackage(supabase, myCase.id, "self_guided"),
    hasPaidPackage(supabase, myCase.id, "full_concierge"),
  ]) : [false, false]
  const hasAccess = paid.some(Boolean)

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-6">
        <div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl border border-brass/25 bg-brass/10 text-brass-bright"><LockKeyhole className="size-6" /></span><h1 className="mt-4 font-display text-3xl font-semibold">Full assistant unlocks with your plan</h1><p className="mt-2 text-sm leading-6 text-text-mid">The public website includes the preset answer library. The conversational Claude assistant becomes available after your Self-Guided or Full Concierge payment is recorded.</p></div>
        <Card><CardContent className="space-y-3 p-5 text-sm text-text-mid"><p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> Ask follow-up questions in your own words</p><p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> Receive answers grounded in approved general guidance</p><p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brass" /> Personal legal judgment is always routed to a licensed attorney</p></CardContent></Card>
        <Button asChild className="w-full"><Link href="/portal/enroll">Choose a service plan</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-brass/25 bg-brass/10 text-brass-bright"><Bot className="size-5" /></span><div><h1 className="font-display text-2xl font-semibold">Licensing assistant</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-text-mid">Ask general NYC licensing and workspace questions. Claude uses the approved knowledge boundary and shows the official sources you should confirm.</p></div></div>
      <FirearmAiAssistant enabled={FIREARM_ASSISTANT_ENABLED} />
    </div>
  )
}
