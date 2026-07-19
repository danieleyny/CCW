import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FileDown, Send, Ban, Clock, GraduationCap, CalendarDays, MessageSquare } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"
import { type CaseStageKey, stageIndex } from "@/config/stages"
import { buildMessageTemplates } from "@/config/message-templates"
import { getFees } from "@/lib/fees"
import { evaluatePreFilingGate } from "@/lib/qa-gate"
import { ReticleProgress } from "@/components/ui/reticle-progress"
import { money, formatDate, formatDateTime, daysSince, daysUntil } from "@/lib/format"
import { StageControl } from "@/components/admin/stage-control"
import { DocumentReview, type DocRow } from "@/components/admin/document-review"
import { RequirementsReview, type CaseReqRow } from "@/components/admin/requirements-review"
import { RecordLicenseControl } from "@/components/admin/record-license-control"
import { DisclosureReview, type DisclosureRow } from "@/components/admin/disclosure-review"
import { CaseNotes, type NoteRow } from "@/components/admin/case-notes"
import { CaseTasks, type CaseTaskRow, type StaffOption } from "@/components/admin/case-tasks"
import { AssignControl } from "@/components/admin/assign-control"
import { QaGateCard } from "@/components/admin/qa-gate-card"
import { MarkMessagesRead } from "@/components/admin/mark-read"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import {
  postMessage,
} from "@/app/admin/actions"
import {
  sendReferenceRequest,
  sendCohabitantRequest,
  revokeReferenceLink,
  revokeCohabitantLink,
} from "@/app/portal/people/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function CaseFilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireStaff()
  const supabase = await createClient()

  const { data: kase } = await supabase
    .from("cases")
    .select("*, clients(*)")
    .eq("id", id)
    .single()
  if (!kase) notFound()

  const client = kase.clients as unknown as {
    id: string
    full_name: string
    email: string | null
    phone: string | null
    borough: string | null
    track: string
    assigned_staff: string | null
    license_type: string | null
  }

  const [
    reqsRes,
    disclosuresRes,
    docsRes,
    refsRes,
    refReqsRes,
    cohabRes,
    trainingRes,
    engagementsRes,
    bookingsRes,
    offersRes,
    paymentsRes,
    notesRes,
    tasksRes,
    messagesRes,
    activityRes,
    staffListRes,
    apptRes,
  ] = await Promise.all([
    supabase
      .from("case_requirements")
      .select("id, req_code, status, notes, document_id, requirements!inner(title, authority, severity, blocking)")
      .eq("case_id", id)
      .order("req_code"),
    supabase.from("disclosures").select("*").eq("case_id", id).order("type"),
    supabase.from("documents").select("*").eq("case_id", id).order("created_at"),
    supabase.from("character_references").select("*").eq("case_id", id),
    supabase.from("reference_requests").select("reference_id, status, sent_at, opened_at, answered_at, notarized_at, revoked_at, expires_at").eq("case_id", id),
    supabase.from("cohabitants").select("*").eq("case_id", id),
    supabase.from("training_sessions").select("*, instructors(name)").eq("case_id", id),
    supabase.from("engagements").select("id, status, scope_full_assist, created_at, instructors(name, email)").eq("case_id", id),
    supabase.from("bookings").select("id, type, status, starts_at, ends_at, instructors(name)").eq("case_id", id).order("starts_at"),
    supabase.from("case_offers").select("id, status, created_at").eq("case_id", id),
    supabase.from("payments").select("*").eq("case_id", id).order("created_at"),
    supabase.from("case_notes").select("id, body, pinned, created_at, profiles:author(full_name)").eq("case_id", id).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("tasks").select("id, title, description, due_date, priority, status, profiles:assignee(full_name)").eq("case_id", id).order("status").order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("messages")
      .select("id, body, created_at, profiles:sender_id(full_name, role)")
      .eq("case_id", id)
      .order("created_at"),
    supabase
      .from("activity_log")
      .select("id, action, entity, detail, created_at, profiles:actor(full_name)")
      .eq("case_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("id, full_name").in("role", ["staff", "admin"]).order("full_name"),
    supabase.from("appointments").select("type, scheduled_at, location").eq("case_id", id).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(1),
  ])

  // Signed URLs for uploaded documents.
  const docs: DocRow[] = await Promise.all(
    (docsRes.data ?? []).map(async (d) => {
      let signedUrl: string | null = null
      if (d.file_path) {
        const { data } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 3600)
        signedUrl = data?.signedUrl ?? null
      }
      return {
        id: d.id, type: d.type, status: d.status, notarized: d.notarized,
        version: d.version, review_notes: d.review_notes, file_name: d.file_name, signedUrl,
        generated: d.generated, signed_at: d.signed_at,
      }
    })
  )
  const docNameById = new Map((docsRes.data ?? []).map((d) => [d.id, d.file_name ?? d.type]))

  // Requirements rows (the one checklist) + gate.
  // Trainer reviews feed the QA picture: staff can see an item was checked, by
  // whom and when, without that changing who may sign off.
  const { data: trainerReviews } = await supabase
    .from("requirement_reviews")
    .select("case_requirement_id, decision, note, created_at, reviewer_kind, profiles(full_name)")
    .eq("case_id", id)
    .eq("reviewer_kind", "trainer")
    .order("created_at", { ascending: false })
  const reviewByReq = new Map<string, { decision: string; note: string | null; at: string; reviewer: string | null }>()
  for (const rv of trainerReviews ?? []) {
    if (reviewByReq.has(rv.case_requirement_id)) continue
    const who = rv.profiles as unknown as { full_name: string | null } | null
    reviewByReq.set(rv.case_requirement_id, {
      decision: rv.decision,
      note: rv.note,
      at: rv.created_at,
      reviewer: who?.full_name ?? null,
    })
  }

  const reqRows: CaseReqRow[] = (reqsRes.data ?? []).map((r) => {
    const req = r.requirements as unknown as { title: string; authority: string | null; severity: string; blocking: boolean }
    return {
      id: r.id, reqCode: r.req_code, status: r.status, notes: r.notes,
      documentId: r.document_id, title: req.title, authority: req.authority,
      trainerReview: reviewByReq.get(r.id) ?? null,
      severity: req.severity, blocking: req.blocking,
    }
  })
  const gate = await evaluatePreFilingGate(supabase, id)
  const signedOffByName = kase.qa_signed_off_by
    ? ((staffListRes.data ?? []).find((s) => s.id === kase.qa_signed_off_by)?.full_name ?? "staff")
    : null

  // Disclosures + bound evidence (via the requirement each one spawned).
  const reqDocByCode = new Map(
    (reqsRes.data ?? []).filter((r) => r.document_id).map((r) => [r.req_code, r.document_id as string])
  )
  const disclosureRows: DisclosureRow[] = (disclosuresRes.data ?? []).map((d) => ({
    id: d.id,
    type: d.type,
    occurredOn: d.occurred_on,
    jurisdiction: d.jurisdiction_text,
    disposition: d.disposition,
    narrative: d.narrative ?? "",
    questionNo: d.question_no,
    spawnedReqCode: d.spawned_req_code,
    boundDocName: d.spawned_req_code
      ? (docNameById.get(reqDocByCode.get(d.spawned_req_code) ?? "") ?? null)
      : null,
  }))

  // People: token status per reference / cohabitant.
  const refReqByRef = new Map((refReqsRes.data ?? []).map((r) => [r.reference_id, r]))

  const notes: NoteRow[] = (notesRes.data ?? []).map((n) => ({
    id: n.id, body: n.body, pinned: n.pinned, createdAt: n.created_at,
    authorName: (n.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
  }))
  const tasks: CaseTaskRow[] = (tasksRes.data ?? []).map((t) => ({
    id: t.id, title: t.title, description: t.description, dueDate: t.due_date,
    priority: t.priority, status: t.status,
    assigneeName: (t.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
  }))
  const staff: StaffOption[] = (staffListRes.data ?? []).map((s) => ({ id: s.id, name: s.full_name ?? "—" }))

  const messages: MessageRow[] = (messagesRes.data ?? []).map((m) => {
    const p = m.profiles as unknown as { full_name: string; role: string } | null
    return { id: m.id, body: m.body, created_at: m.created_at, senderName: p?.full_name ?? null, senderRole: p?.role ?? null }
  })

  // Left-rail vitals.
  const stage = kase.stage as CaseStageKey
  const blockingOpen = reqRows.filter((r) => r.blocking && r.status === "pending").length
  const daysInStage = daysSince(kase.stage_entered_at) ?? 0
  const lastClientMsg = [...(messagesRes.data ?? [])]
    .reverse()
    .find((m) => (m.profiles as unknown as { role: string } | null)?.role === "client")
  const lastDoc = (docsRes.data ?? []).at(-1)
  const lastClientActivity = [lastClientMsg?.created_at, lastDoc?.created_at]
    .filter(Boolean)
    .sort()
    .at(-1) as string | undefined
  const clientIdleDays = daysSince(lastClientActivity ?? null)
  const trainingDaysLeft = daysUntil(kase.training_expires_on)
  const nextAppt = apptRes.data?.[0]
  const lastMessage = (messagesRes.data ?? []).at(-1)

  return (
    <div className="mx-auto max-w-6xl">
      <MarkMessagesRead caseId={id} />
      <Link
        href="/admin/cases"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All cases
      </Link>

      {/* Header + left-rail vitals */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">{client.full_name}</h2>
                <StatusBadge status={kase.status} />
                {kase.is_renewal && (
                  <span className="rounded bg-brass/15 px-2 py-0.5 text-xs font-medium text-brass-bright">Renewal</span>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {client.email ?? "no email"} · {client.phone ?? "no phone"} · {client.borough ?? "—"} ·{" "}
                <span className="capitalize">{client.track.replace(/_/g, " ")}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Assigned</span>
                <AssignControl caseId={id} clientId={client.id} current={client.assigned_staff} staff={staff} />
                <span>· Opened {formatDate(kase.opened_at)}{kase.nypd_app_ref && ` · NYPD ${kase.nypd_app_ref}`}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StageControl caseId={kase.id} stage={stage} status={kase.status} />
              <div className="flex items-center gap-2">
                <a
                  href={`/admin/cases/${kase.id}/filing-pack`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-brass/40 bg-brass/8 px-3 py-1.5 text-xs font-medium text-brass-bright transition-colors hover:bg-brass/15"
                >
                  <FileDown className="size-3.5" /> Filing pack
                </a>
                <a
                  href={`/admin/cases/${kase.id}/packet`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-text-mid transition-colors hover:text-foreground"
                >
                  <FileDown className="size-3.5" /> Docs only
                </a>
              </div>
              {stageIndex(stage) >= stageIndex("filed") && (
                <RecordLicenseControl
                  caseId={kase.id}
                  isSpecialCarry={client.track === "non_resident"}
                  defaultLicenseType={client.license_type}
                  issued={!!kase.license_expires_on}
                />
              )}
            </div>
          </div>

          {/* Vitals strip — the numbers that matter, always visible */}
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
            <Vital tone={blockingOpen ? "warn" : "ok"}>
              <b>{blockingOpen}</b>&nbsp;blocking requirement{blockingOpen === 1 ? "" : "s"} open
            </Vital>
            <Vital tone={daysInStage > 14 ? "warn" : "none"}>
              <Clock className="size-3.5" /> <b>{daysInStage}d</b>&nbsp;in stage
            </Vital>
            <Vital tone={clientIdleDays != null && clientIdleDays > 7 ? "warn" : "none"}>
              <MessageSquare className="size-3.5" />
              {clientIdleDays == null ? "no client activity yet" : <><b>{clientIdleDays}d</b>&nbsp;since client activity</>}
            </Vital>
            <Vital tone={trainingDaysLeft != null && trainingDaysLeft <= 30 ? (trainingDaysLeft < 0 ? "danger" : "warn") : "none"}>
              <GraduationCap className="size-3.5" />
              {trainingDaysLeft == null
                ? "training not recorded"
                : trainingDaysLeft < 0
                  ? <>training <b>expired</b></>
                  : <>training valid&nbsp;<b>{trainingDaysLeft}d</b></>}
            </Vital>
            <Vital tone="none">
              <CalendarDays className="size-3.5" />
              {nextAppt
                ? <>{nextAppt.type} {formatDateTime(nextAppt.scheduled_at)}</>
                : lastMessage
                  ? <>last msg {formatDate(lastMessage.created_at)}</>
                  : "no upcoming appointment"}
            </Vital>
          </div>

          <ReticleProgress currentStage={stage} className="mt-6" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="requirements">
        <TabsList className="flex-wrap">
          <TabsTrigger value="requirements">Requirements ({blockingOpen})</TabsTrigger>
          <TabsTrigger value="disclosures">Disclosures ({disclosureRows.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({docs.length})</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="training">Training &amp; Scheduling</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.filter((t) => t.status !== "done").length})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="mt-4 space-y-4">
          <QaGateCard
            caseId={id}
            blockers={gate.blockers.filter((b) => b.kind !== "sign_off_missing").map((b) => b.detail)}
            readyForSignOff={gate.readyForSignOff}
            signedOffBy={signedOffByName}
            signedOffAt={kase.qa_signed_off_at}
          />
          <RequirementsReview caseId={id} rows={reqRows} />
        </TabsContent>

        <TabsContent value="disclosures" className="mt-4">
          <DisclosureReview caseId={id} rows={disclosureRows} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentReview caseId={kase.id} clientId={client.id} documents={docs} />
        </TabsContent>

        <TabsContent value="people" className="mt-4 space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Character references</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Family?</TableHead>
                  <TableHead>Link status</TableHead>
                  <TableHead>Notarized</TableHead>
                  <TableHead className="text-right">Outreach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(refsRes.data ?? []).map((r) => {
                  const req = refReqByRef.get(r.id)
                  const linkStatus = req?.revoked_at
                    ? "revoked"
                    : req?.notarized_at
                      ? "notarized"
                      : req?.answered_at
                        ? "submitted"
                        : req?.opened_at
                          ? "opened"
                          : req?.sent_at
                            ? "sent"
                            : "not sent"
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.relationship ?? "—"}</TableCell>
                      <TableCell>{r.is_family ? "Family" : "Unrelated"}</TableCell>
                      <TableCell className="capitalize">{linkStatus}</TableCell>
                      <TableCell>{r.notarized ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {r.contact_email && !r.notarized && (
                            <form action={sendReferenceRequest}>
                              <input type="hidden" name="referenceId" value={r.id} />
                              <Button type="submit" size="sm" variant="outline">
                                <Send className="size-3" /> {req ? "Resend" : "Send"}
                              </Button>
                            </form>
                          )}
                          {req && !req.revoked_at && !r.notarized && (
                            <form action={revokeReferenceLink}>
                              <input type="hidden" name="referenceId" value={r.id} />
                              <Button type="submit" size="sm" variant="ghost" className="text-text-low">
                                <Ban className="size-3" /> Revoke
                              </Button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {(refsRes.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No references collected yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Cohabitants (18+)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Affidavit</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead className="text-right">Outreach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(cohabRes.data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.relationship ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={c.affidavit_status ?? "not_started"} /></TableCell>
                    <TableCell className="text-xs capitalize">
                      {c.token_revoked_at ? "revoked" : c.token ? "invited" : "not invited"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {c.contact_email && c.affidavit_status !== "notarized" && (
                          <form action={sendCohabitantRequest}>
                            <input type="hidden" name="cohabitantId" value={c.id} />
                            <Button type="submit" size="sm" variant="outline">
                              <Send className="size-3" /> {c.token ? "Resend" : "Send"}
                            </Button>
                          </form>
                        )}
                        {c.token && !c.token_revoked_at && c.affidavit_status !== "notarized" && (
                          <form action={revokeCohabitantLink}>
                            <input type="hidden" name="cohabitantId" value={c.id} />
                            <Button type="submit" size="sm" variant="ghost" className="text-text-low">
                              <Ban className="size-3" /> Revoke
                            </Button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(cohabRes.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No cohabitants listed.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        <TabsContent value="training" className="mt-4 space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Marketplace engagement</h3>
            {(engagementsRes.data ?? []).length === 0 && (offersRes.data ?? []).length === 0 ? (
              <Empty>No instructor engaged and no open offers.</Empty>
            ) : (
              <ul className="space-y-2 text-sm">
                {(engagementsRes.data ?? []).map((e) => {
                  const inst = e.instructors as unknown as { name: string; email: string | null } | null
                  return (
                    <li key={e.id} className="rounded-lg border bg-card p-3">
                      <b>{inst?.name ?? "—"}</b> · engagement {e.status}
                      {e.scope_full_assist && <span className="ml-2 rounded bg-signal-dim px-1.5 py-0.5 text-[10px] text-signal">full assist</span>}
                      <span className="ml-2 text-xs text-text-low">since {formatDate(e.created_at)}</span>
                    </li>
                  )
                })}
                {(offersRes.data ?? []).map((o) => (
                  <li key={o.id} className="rounded-lg border border-dashed bg-card p-3 text-text-mid">
                    Offer {o.status} · posted {formatDate(o.created_at)}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Bookings</h3>
            {(bookingsRes.data ?? []).length === 0 ? (
              <Empty>No bookings.</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead><TableHead>Instructor</TableHead>
                    <TableHead>Starts</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bookingsRes.data ?? []).map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="capitalize">{b.type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{(b.instructors as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                      <TableCell>{formatDateTime(b.starts_at)}</TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Training record</h3>
            {(trainingRes.data ?? []).length === 0 ? (
              <Empty>No training sessions recorded.</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instructor</TableHead><TableHead>Class</TableHead><TableHead>Range</TableHead>
                    <TableHead>Score</TableHead><TableHead>Passed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(trainingRes.data ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{(r.instructors as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                      <TableCell>{formatDate(r.class_date)}</TableCell>
                      <TableCell>{formatDate(r.range_date)}</TableCell>
                      <TableCell>{r.test_score ?? "—"}</TableCell>
                      <TableCell>{r.passed == null ? "—" : r.passed ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {kase.training_expires_on && (
              <p className="mt-2 text-xs text-text-low">
                Training completed {formatDate(kase.training_completed_on)} · valid for submission until{" "}
                <b className={trainingDaysLeft != null && trainingDaysLeft <= 30 ? "text-warn" : ""}>{formatDate(kase.training_expires_on)}</b>
              </p>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Payments</h3>
            {(paymentsRes.data ?? []).length === 0 ? (
              <Empty>No payments recorded.</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead><TableHead>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paymentsRes.data ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.description ?? "—"}</TableCell>
                      <TableCell>{money(p.amount_cents)}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{p.paid_at ? formatDate(p.paid_at) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <CaseNotes caseId={id} notes={notes} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <CaseTasks caseId={id} tasks={tasks} staff={staff} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <MessageThread
                caseId={kase.id}
                messages={messages}
                send={postMessage}
                placeholder="Write a message to the client…"
                templates={buildMessageTemplates(await getFees(supabase))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ul className="space-y-3 rounded-lg border bg-card p-4">
            {(activityRes.data ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">No activity yet.</li>
            )}
            {(activityRes.data ?? []).map((a) => {
              const actor = (a.profiles as unknown as { full_name: string } | null)?.full_name
              return (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <span className="font-medium">{a.action.replace(/[._]/g, " ")}</span>
                    {actor && <span className="text-muted-foreground"> · {actor}</span>}
                    <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Vital({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "danger" | "none" }) {
  const tones = {
    ok: "border-ok/30 bg-ok/8 text-ok",
    warn: "border-warn/30 bg-warn/8 text-warn",
    danger: "border-danger/30 bg-danger/10 text-danger",
    none: "border-hairline bg-surface-1 text-text-mid",
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 ${tones[tone]}`}>
      {children}
    </span>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}
