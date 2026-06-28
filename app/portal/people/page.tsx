import { Send, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import {
  ReferenceCollector,
  CohabitantCollector,
  type ReferenceRow,
  type CohabitantRow,
} from "@/components/portal/collectors"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { sendReferenceRequest } from "./actions"

export const metadata = { title: "References & household" }

export default async function PeoplePage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const supabase = await createClient()
  const [refs, cohabs, reqs] = await Promise.all([
    supabase
      .from("character_references")
      .select("id, name, relationship, is_family, contact_email, notarized, received")
      .eq("case_id", myCase.id)
      .order("created_at"),
    supabase
      .from("cohabitants")
      .select("id, name, relationship, affidavit_status")
      .eq("case_id", myCase.id)
      .order("created_at"),
    supabase
      .from("reference_requests")
      .select("reference_id, status")
      .eq("case_id", myCase.id),
  ])
  const reqStatus = new Map((reqs.data ?? []).map((r) => [r.reference_id, r.status]))

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">References &amp; household</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your character references and everyone 18+ living with you.
        </p>
      </div>

      <Tabs defaultValue="references">
        <TabsList>
          <TabsTrigger value="references">References ({refs.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="household">Household ({cohabs.data?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="references" className="mt-4 space-y-6">
          <ReferenceCollector caseId={myCase.id} references={(refs.data ?? []) as ReferenceRow[]} />

          {(refs.data ?? []).length > 0 && (
            <div>
              <h2 className="engraved mb-2 text-text-low">Outreach</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Send each reference a one-click link to confirm and attest — no account needed.
                Batch them so you can notarize all references plus cohabitant affidavits in one sitting.
              </p>
              <ul className="space-y-2">
                {(refs.data ?? []).map((r) => {
                  const status = r.received ? "submitted" : reqStatus.get(r.id)
                  return (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm">
                      <span className="min-w-0">
                        <span className="font-medium">{r.name}</span>
                        {r.contact_email ? (
                          <span className="text-text-low"> · {r.contact_email}</span>
                        ) : (
                          <span className="text-warn"> · add an email to send</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {r.received ? (
                          <span className="inline-flex items-center gap-1 text-xs text-ok">
                            <CheckCircle2 className="size-3.5" /> received
                          </span>
                        ) : status ? (
                          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-mid">{status}</span>
                        ) : null}
                        {!r.received && (
                          <form action={sendReferenceRequest}>
                            <input type="hidden" name="referenceId" value={r.id} />
                            <Button type="submit" size="sm" variant="outline" disabled={!r.contact_email}>
                              <Send className="size-3.5" />
                              {status ? "Resend" : "Send link"}
                            </Button>
                          </form>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </TabsContent>
        <TabsContent value="household" className="mt-4">
          <CohabitantCollector caseId={myCase.id} cohabitants={(cohabs.data ?? []) as CohabitantRow[]} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
