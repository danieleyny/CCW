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
import { ConciergeCockpit } from "@/components/admin/concierge-cockpit"
import { InviteClientButton } from "@/components/admin/invite-client-button"
import { RecordLicenseControl } from "@/components/admin/record-license-control"
import { DisclosureReview, type DisclosureRow } from "@/components/admin/disclosure-review"
import { CaseNotes, type NoteRow } from "@/components/admin/case-notes"
import { CaseTasks, type CaseTaskRow, type StaffOption } from "@/components/admin/case-tasks"
import { AssignControl, AssignTrainerControl } from "@/components/admin/assign-control"
import { QaGateCard } from "@/components/admin/qa-gate-card"
import { IntakeReview, type IntakeData } from "@/components/admin/intake-review"
import { MarkMessagesRead } from "@/components/admin/mark-read"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { AssignInstructorForm, StaffInstructorThread } from "@/components/admin/training-controls"
import {
  postMessage,
  adminConfirmBooking,
  adminCancelBooking,
} from "@/app/admin/actions"
import { AdminStartRenewal } from "@/components/admin/start-renewal"
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
    profile_id: string | null
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
    intakeRes,
    engagementMessagesRes,
    staffLaneMessagesRes,
    verifiedInstructorsRes,
  ] = await Promise.all([
    supabase
      .from("case_requirements")
      .select("id, req_code, status, notes, document_id, requirements!inner(title, description, authority, severity, blocking)")
      .eq("case_id", id)
      .order("req_code"),
    supabase.from("disclosures").select("*").eq("case_id", id).order("type"),
    supabase.from("documents").select("*").eq("case_id", id).order("created_at"),
    supabase.from("character_references").select("*").eq("case_id", id),
    supabase.from("reference_requests").select("reference_id, status, sent_at, opened_at, answered_at, notarized_at, revoked_at, expires_at").eq("case_id", id),
    supabase.from("cohabitants").select("*").eq("case_id", id),
    supabase.from("training_sessions").select("*, instructors(name)").eq("case_id", id),
    supabase.from("engagements").select("id, status, scope_full_assist, created_at, instructor_id, instructors(name, email)").eq("case_id", id),
    supabase.from("bookings").select("id, type, status, starts_at, ends_at, instructors(name)").eq("case_id", id).order("starts_at"),
    supabase.from("case_offers").select("id, status, created_at").eq("case_id", id),
    supabase.from("payments").select("*").eq("case_id", id).order("created_at"),
    supabase.from("case_notes").select("id, body, pinned, created_at, profiles:author(full_name)").eq("case_id", id).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("tasks").select("id, title, description, due_date, priority, status, profiles:assignee(full_name)").eq("case_id", id).order("status").order("due_date", { ascending: true, nullsFirst: false }),
    // B1B — the primary Messages tab is the STAFF↔CLIENT lane only
    // (engagement_id IS NULL). Without this filter, instructor↔applicant
    // messages bled into the staff thread and skewed the "last message" /
    // client-activity vitals. The instructor lane is surfaced separately in the
    // Training tab (engagementMessagesRes below).
    supabase
      .from("messages")
      .select("id, body, created_at, profiles:sender_id(full_name, role)")
      .eq("case_id", id)
      .is("engagement_id", null)
      .order("created_at"),
    supabase
      .from("activity_log")
      .select("id, action, entity, detail, created_at, profiles:actor(full_name)")
      .eq("case_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("id, full_name").in("role", ["staff", "admin"]).order("full_name"),
    supabase.from("appointments").select("type, scheduled_at, location").eq("case_id", id).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(1),
    // Admin-only playback of the raw wizard answers (staff-gated page). Shows
    // data only for intakes that actually saved; a null row is the empty state.
    supabase.from("intake_sessions").select("answers, current_step, completed_at, updated_at").eq("case_id", id).maybeSingle(),
    // B1B — the instructor↔applicant lane (engagement_id NOT NULL, staff_only
    // false), surfaced read-only in the Training tab so staff can see it without
    // it contaminating the staff↔client thread.
    supabase
      .from("messages")
      .select("id, body, created_at, engagement_id, profiles:sender_id(full_name, role)")
      .eq("case_id", id)
      .not("engagement_id", "is", null)
      .eq("staff_only", false)
      .order("created_at"),
    // B3B — the private staff↔instructor lane (staff_only true). Staff-visible;
    // the client can never read it (RLS).
    supabase
      .from("messages")
      .select("id, body, created_at, engagement_id, profiles:sender_id(full_name, role)")
      .eq("case_id", id)
      .eq("staff_only", true)
      .order("created_at"),
    // B3A — every instructor for the admin assignment lever. Not verified-only:
    // admin has full assignment power and needs to see all trainers (an
    // unverified one is labelled "pending" in the dropdown).
    supabase.from("instructors").select("id, name, verified").order("verified", { ascending: false }).order("name"),
  ])

  // Map every upload to the requirement it answers, so the reviewer sees WHAT a
  // file is meant to satisfy — not just "ID.jpg". The registry (requirements) is
  // the single source of the label + acceptance line; nothing is duplicated here.
  type ReqInfo = { reqCode: string; title: string; acceptance: string | null; blocking: boolean; severity: string; status: string }
  const reqByCode = new Map<string, ReqInfo>()
  const reqCodeByDocId = new Map<string, string>() // the doc bound as a requirement's satisfying evidence
  const docIdToReqCodes = new Map<string, string[]>() // one upload can satisfy several requirements
  for (const r of reqsRes.data ?? []) {
    const req = r.requirements as unknown as { title: string; description: string | null; blocking: boolean; severity: string }
    reqByCode.set(r.req_code, {
      reqCode: r.req_code, title: req.title, acceptance: req.description,
      blocking: req.blocking, severity: req.severity, status: r.status,
    })
    if (r.document_id) {
      reqCodeByDocId.set(r.document_id, r.req_code)
      docIdToReqCodes.set(r.document_id, [...(docIdToReqCodes.get(r.document_id) ?? []), r.req_code])
    }
  }

  // Signed URLs for uploaded documents.
  const docs: DocRow[] = await Promise.all(
    (docsRes.data ?? []).map(async (d) => {
      let signedUrl: string | null = null
      if (d.file_path) {
        const { data } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 300)
        signedUrl = data?.signedUrl ?? null
      }
      // req_code is the per-upload binding (what the uploader was answering);
      // fall back to the satisfying-doc binding for legacy rows with no req_code.
      const reqCode = (d.req_code && reqByCode.has(d.req_code)) ? d.req_code : (reqCodeByDocId.get(d.id) ?? null)
      const req = reqCode ? reqByCode.get(reqCode) ?? null : null
      // If this exact upload also satisfies other requirements, name them so the
      // reviewer isn't fooled into thinking it's a separate document each time.
      const alsoTitles = (docIdToReqCodes.get(d.id) ?? [])
        .filter((c) => c !== reqCode)
        .map((c) => reqByCode.get(c)?.title)
        .filter((t): t is string => Boolean(t))
      return {
        id: d.id, type: d.type, status: d.status, notarized: d.notarized,
        version: d.version, review_notes: d.review_notes, file_name: d.file_name, signedUrl,
        generated: d.generated, signed_at: d.signed_at, created_at: d.created_at,
        reqCode, reqTitle: req?.title ?? null, acceptance: req?.acceptance ?? null,
        reqBlocking: req?.blocking ?? false, reqStatus: req?.status ?? null,
        sameFileAs: alsoTitles,
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

  // B1B — instructor↔applicant lane (read-only), for the Training tab. Kept
  // strictly separate from the staff↔client thread above; never merged.
  const engInstructorName = new Map(
    (engagementsRes.data ?? []).map((e) => [
      e.id,
      (e.instructors as unknown as { name: string } | null)?.name ?? "Instructor",
    ])
  )
  const engagementMessages = (engagementMessagesRes.data ?? []).map((m) => {
    const p = m.profiles as unknown as { full_name: string; role: string } | null
    const engId = m.engagement_id as string | null
    return {
      id: m.id,
      body: m.body,
      createdAt: m.created_at,
      senderName: p?.full_name ?? null,
      senderRole: p?.role ?? null,
      instructorName: engId ? engInstructorName.get(engId) ?? "Instructor" : "Instructor",
    }
  })

  // B3A/B3B — the active engagement (assignment target + staff-lane key), the
  // verified-instructor list for the lever, and the private staff↔instructor
  // thread.
  const activeEngagement = (engagementsRes.data ?? []).find((e) => e.status === "active")
  const activeEngagementId = activeEngagement?.id ?? null
  const activeInstructorName =
    (activeEngagement?.instructors as unknown as { name: string } | null)?.name ?? null
  const activeInstructorId = activeEngagement?.instructor_id ?? null
  const verifiedInstructors = (verifiedInstructorsRes.data ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    verified: i.verified,
  }))
  const staffLaneMessages = (staffLaneMessagesRes.data ?? []).map((m) => {
    const p = m.profiles as unknown as { full_name: string; role: string } | null
    return {
      id: m.id,
      body: m.body,
      createdAt: m.created_at,
      senderName: p?.full_name ?? null,
      senderRole: p?.role ?? null,
    }
  })

  // Raw intake answers for the admin-only "Intake responses" tab. Null = no
  // session row saved for this case (the empty state, not an error).
  const intake: IntakeData | null = intakeRes.data
    ? {
        answers: (intakeRes.data.answers ?? {}) as unknown as IntakeData["answers"],
        currentStep: intakeRes.data.current_step,
        completedAt: intakeRes.data.completed_at,
        updatedAt: intakeRes.data.updated_at,
      }
    : null

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
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>Consultant</span>
                <AssignControl caseId={id} clientId={client.id} current={client.assigned_staff} staff={staff} />
                <span>· Trainer</span>
                <AssignTrainerControl caseId={id} current={activeInstructorId} instructors={verifiedInstructors} />
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
              {stage === "licensed" && !kase.is_renewal && <AdminStartRenewal caseId={kase.id} />}
              {/* CONCIERGE QA Phase 5 — a provisioned account is never left with
                  no route in: send or copy a set-password invite. */}
              {client.profile_id && client.email && <InviteClientButton caseId={kase.id} />}
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

      {/* CONCIERGE Phase 5 — the done-for-you cockpit, only for concierge cases */}
      {kase.service_mode === "concierge" && (
        <ConciergeCockpit caseId={kase.id} clientName={client.full_name} stage={stage} />
      )}

      {/* Tabs */}
      <Tabs defaultValue="requirements">
        <TabsList className="flex-wrap">
          <TabsTrigger value="requirements">Requirements ({blockingOpen})</TabsTrigger>
          <TabsTrigger value="intake">Intake responses</TabsTrigger>
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

        <TabsContent value="intake" className="mt-4">
          <IntakeReview intake={intake} />
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
                      {/* Same journey derivation as references: revoked > submitted > opened > sent > not sent. */}
                      {c.token_revoked_at
                        ? "revoked"
                        : c.answered_at
                          ? "submitted"
                          : c.opened_at
                            ? "opened"
                            : c.sent_at || c.token
                              ? "sent"
                              : "not sent"}
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
            {/* B3A — admin can assign/reassign any verified instructor directly,
                overriding applicant choice. Logged + the applicant is notified. */}
            <div className="mb-3 rounded-lg border border-dashed bg-card p-3">
              <p className="mb-2 text-xs text-text-low">
                Assign an instructor on the applicant&apos;s behalf (for stuck cases). This overrides
                their marketplace choice, is logged, and notifies the applicant.
              </p>
              <AssignInstructorForm
                caseId={id}
                instructors={verifiedInstructors}
                currentName={activeInstructorName}
              />
            </div>
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
          {/* B1B — the instructor↔applicant lane, read-only and clearly labeled,
              kept out of the staff↔client Messages tab. */}
          <section>
            <h3 className="mb-2 text-sm font-semibold">Instructor ↔ applicant messages</h3>
            <p className="mb-2 text-xs text-text-low">
              Read-only. The applicant&apos;s conversation with their instructor — separate from your
              staff thread with the client.
            </p>
            {engagementMessages.length === 0 ? (
              <Empty>No instructor↔applicant messages.</Empty>
            ) : (
              <ul className="space-y-2">
                {engagementMessages.map((m) => (
                  <li key={m.id} className="rounded-lg border bg-card p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-text-low">
                      <span>
                        {m.senderRole === "instructor" ? m.instructorName : m.senderName ?? "Applicant"}
                        {" · "}
                        <span className="capitalize">{m.senderRole ?? "—"}</span>
                      </span>
                      <span>{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-text-mid">{m.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {/* B3B — private staff↔instructor channel (the client never sees it). */}
          <section>
            <h3 className="mb-2 text-sm font-semibold">Staff ↔ instructor (private)</h3>
            <p className="mb-2 text-xs text-text-low">
              A coordination channel between staff and the assigned instructor. The applicant can&apos;t
              see it — never share disclosures or PII here.
            </p>
            <StaffInstructorThread
              caseId={id}
              engagementId={activeEngagementId}
              messages={staffLaneMessages}
            />
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bookingsRes.data ?? []).map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="capitalize">{b.type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{(b.instructors as unknown as { name: string } | null)?.name ?? "—"}</TableCell>
                      <TableCell>{formatDateTime(b.starts_at)}</TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                      {/* B3A — staff can confirm/cancel a booking (mirror of the
                          instructor action). Terminal states show nothing. */}
                      <TableCell className="text-right">
                        {b.status !== "cancelled" && b.status !== "completed" ? (
                          <div className="flex justify-end gap-1">
                            {b.status !== "confirmed" && (
                              <form action={adminConfirmBooking}>
                                <input type="hidden" name="bookingId" value={b.id} />
                                <Button type="submit" size="sm" variant="outline">Confirm</Button>
                              </form>
                            )}
                            <form action={adminCancelBooking}>
                              <input type="hidden" name="bookingId" value={b.id} />
                              <Button type="submit" size="sm" variant="ghost">Cancel</Button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-text-low">—</span>
                        )}
                      </TableCell>
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
              // CONCIERGE Phase 9 — flag staff work done on the applicant's behalf.
              const onBehalf = (a.detail as { on_behalf?: boolean } | null)?.on_behalf === true
              return (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <span className="font-medium">{a.action.replace(/[._]/g, " ")}</span>
                    {actor && <span className="text-muted-foreground"> · {actor}</span>}
                    {onBehalf && (
                      <span className="ml-1.5 rounded-full bg-brass/15 px-1.5 py-0.5 text-[10px] font-medium text-brass-bright">
                        on behalf
                      </span>
                    )}
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
