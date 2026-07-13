import { Send, CheckCircle2, Ban } from "lucide-react"
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
import { NotarizedUpload } from "@/components/portal/notarized-upload"
import { CopyLinkButton } from "@/components/portal/copy-link-button"
import {
  sendReferenceRequest,
  sendCohabitantRequest,
  recordReferenceUpload,
  recordCohabitantUpload,
  revokeReferenceLink,
  revokeCohabitantLink,
} from "./actions"

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
      .select("id, name, relationship, affidavit_status, contact_email, token")
      .eq("case_id", myCase.id)
      .order("created_at"),
    supabase
      .from("reference_requests")
      .select("reference_id, status, token")
      .eq("case_id", myCase.id),
  ])
  const reqByRef = new Map((reqs.data ?? []).map((r) => [r.reference_id, r]))

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
                  const req = reqByRef.get(r.id)
                  const reqSt = req?.status
                  const label = r.notarized
                    ? "notarized"
                    : r.received
                      ? "responded"
                      : reqSt === "opened"
                        ? "opened link"
                        : reqSt
                          ? "invited"
                          : "not invited"
                  const tone = r.notarized
                    ? "bg-ok/12 text-ok"
                    : r.received
                      ? "bg-signal-dim text-signal"
                      : "bg-surface-2 text-text-mid"
                  return (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm">
                      <span className="min-w-0">
                        <span className="font-medium">{r.name}</span>
                        {r.contact_email ? (
                          <span className="text-text-low"> · {r.contact_email}</span>
                        ) : (
                          <span className="text-warn"> · add an email to invite</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${tone}`}>
                          {r.notarized && <CheckCircle2 className="size-3" />}
                          {label}
                        </span>
                        {!r.notarized && req?.token && <CopyLinkButton token={req.token} basePath="/r/" />}
                        {!r.notarized && (
                          <NotarizedUpload targetId={r.id} clientId={myCase.client_id} record={recordReferenceUpload} />
                        )}
                        {!r.notarized && r.contact_email && (
                          <form action={sendReferenceRequest}>
                            <input type="hidden" name="referenceId" value={r.id} />
                            <Button type="submit" size="sm" variant="outline">
                              <Send className="size-3.5" />
                              {reqSt ? "Resend" : "Send link"}
                            </Button>
                          </form>
                        )}
                        {!r.notarized && req?.token && (
                          <form action={revokeReferenceLink}>
                            <input type="hidden" name="referenceId" value={r.id} />
                            <Button type="submit" size="sm" variant="ghost" className="text-text-low">
                              <Ban className="size-3.5" /> Revoke
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
        <TabsContent value="household" className="mt-4 space-y-6">
          <CohabitantCollector caseId={myCase.id} cohabitants={(cohabs.data ?? []) as CohabitantRow[]} />

          {(cohabs.data ?? []).length > 0 && (
            <div>
              <h2 className="engraved mb-2 text-text-low">Affidavits</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Each adult gets a one-click link to confirm and notarize their affidavit — we build the
                document for them. Or upload a notarized copy yourself.
              </p>
              <ul className="space-y-2">
                {(cohabs.data ?? []).map((c) => {
                  const st = c.affidavit_status
                  const label = st === "notarized" ? "notarized" : st === "received" ? "confirmed" : c.token ? "invited" : "not invited"
                  const tone = st === "notarized" ? "bg-ok/12 text-ok" : st === "received" ? "bg-signal-dim text-signal" : "bg-surface-2 text-text-mid"
                  return (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm">
                      <span className="min-w-0">
                        <span className="font-medium">{c.name}</span>
                        {c.contact_email ? (
                          <span className="text-text-low"> · {c.contact_email}</span>
                        ) : (
                          <span className="text-warn"> · add an email to invite</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${tone}`}>
                          {st === "notarized" && <CheckCircle2 className="size-3" />}
                          {label}
                        </span>
                        {st !== "notarized" && c.token && <CopyLinkButton token={c.token} basePath="/c/" />}
                        {st !== "notarized" && (
                          <NotarizedUpload targetId={c.id} clientId={myCase.client_id} record={recordCohabitantUpload} />
                        )}
                        {st !== "notarized" && c.contact_email && (
                          <form action={sendCohabitantRequest}>
                            <input type="hidden" name="cohabitantId" value={c.id} />
                            <Button type="submit" size="sm" variant="outline">
                              <Send className="size-3.5" />
                              {c.token ? "Resend" : "Send link"}
                            </Button>
                          </form>
                        )}
                        {st !== "notarized" && c.token && (
                          <form action={revokeCohabitantLink}>
                            <input type="hidden" name="cohabitantId" value={c.id} />
                            <Button type="submit" size="sm" variant="ghost" className="text-text-low">
                              <Ban className="size-3.5" /> Revoke
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
      </Tabs>
    </div>
  )
}
