import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"
import { type CaseStageKey } from "@/config/stages"
import { ReticleProgress } from "@/components/ui/reticle-progress"
import { money, formatDate, formatDateTime } from "@/lib/format"
import { StageControl } from "@/components/admin/stage-control"
import { ChecklistEngine, type ChecklistItemRow } from "@/components/admin/checklist-engine"
import { DocumentReview, type DocRow } from "@/components/admin/document-review"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { postMessage } from "@/app/admin/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent } from "@/components/ui/card"
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
  }

  const [
    checklistRes,
    docsRes,
    refsRes,
    cohabRes,
    trainingRes,
    paymentsRes,
    messagesRes,
    activityRes,
    staffRes,
  ] = await Promise.all([
    supabase.from("checklist_items").select("*").eq("case_id", id),
    supabase.from("documents").select("*").eq("case_id", id).order("created_at"),
    supabase.from("character_references").select("*").eq("case_id", id),
    supabase.from("cohabitants").select("*").eq("case_id", id),
    supabase.from("training_sessions").select("*, instructors(name)").eq("case_id", id),
    supabase.from("payments").select("*").eq("case_id", id).order("created_at"),
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
    client.assigned_staff
      ? supabase.from("profiles").select("full_name").eq("id", client.assigned_staff).single()
      : Promise.resolve({ data: null }),
  ])

  // Signed URLs for any uploaded document files.
  const docs: DocRow[] = await Promise.all(
    (docsRes.data ?? []).map(async (d) => {
      let signedUrl: string | null = null
      if (d.file_path) {
        const { data } = await supabase.storage
          .from("documents")
          .createSignedUrl(d.file_path, 3600)
        signedUrl = data?.signedUrl ?? null
      }
      return {
        id: d.id,
        type: d.type,
        status: d.status,
        notarized: d.notarized,
        version: d.version,
        review_notes: d.review_notes,
        file_name: d.file_name,
        signedUrl,
      }
    })
  )

  const checklist = (checklistRes.data ?? []) as ChecklistItemRow[]
  const messages: MessageRow[] = (messagesRes.data ?? []).map((m) => {
    const p = m.profiles as unknown as { full_name: string; role: string } | null
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      senderName: p?.full_name ?? null,
      senderRole: p?.role ?? null,
    }
  })

  const stage = kase.stage as CaseStageKey
  const assignedName = (staffRes.data as { full_name: string } | null)?.full_name ?? "Unassigned"

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/cases"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All cases
      </Link>

      {/* Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">{client.full_name}</h2>
                <StatusBadge status={kase.status} />
                {kase.is_renewal && (
                  <span className="rounded bg-brass/15 px-2 py-0.5 text-xs font-medium text-brass-bright">
                    Renewal
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {client.email ?? "no email"} · {client.phone ?? "no phone"} ·{" "}
                {client.borough ?? "—"} · <span className="capitalize">{client.track.replace(/_/g, " ")}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Assigned to {assignedName} · Opened {formatDate(kase.opened_at)}
                {kase.nypd_app_ref && ` · NYPD ${kase.nypd_app_ref}`}
              </div>
            </div>
            <StageControl caseId={kase.id} stage={stage} status={kase.status} />
          </div>

          {/* Reticle progress */}
          <ReticleProgress currentStage={stage} className="mt-6" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="checklist">
        <TabsList className="flex-wrap">
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="documents">Documents ({docs.length})</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="billing">Training &amp; Billing</TabsTrigger>
          <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-4">
          <ChecklistEngine caseId={kase.id} items={checklist} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentReview caseId={kase.id} clientId={client.id} documents={docs} />
        </TabsContent>

        <TabsContent value="people" className="mt-4 space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Character references</h3>
            <ReferencesTable rows={refsRes.data ?? []} />
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Cohabitants (18+)</h3>
            <CohabitantsTable rows={cohabRes.data ?? []} />
          </section>
        </TabsContent>

        <TabsContent value="billing" className="mt-4 space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Training</h3>
            <TrainingTable rows={trainingRes.data ?? []} />
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Payments</h3>
            <PaymentsTable rows={paymentsRes.data ?? []} />
          </section>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <MessageThread
                caseId={kase.id}
                messages={messages}
                send={postMessage}
                placeholder="Write a message to the client…"
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
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatDateTime(a.created_at)}
                    </span>
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

// ── read-only sub-tables ───────────────────────────────────────────────────────
function ReferencesTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0)
    return <Empty>No references collected yet.</Empty>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Relationship</TableHead>
          <TableHead>Family?</TableHead>
          <TableHead>Received</TableHead>
          <TableHead>Notarized</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id as string}>
            <TableCell className="font-medium">{r.name as string}</TableCell>
            <TableCell className="text-muted-foreground">{(r.relationship as string) ?? "—"}</TableCell>
            <TableCell>{r.is_family ? "Family" : "Unrelated"}</TableCell>
            <TableCell>{r.received ? "Yes" : "No"}</TableCell>
            <TableCell>{r.notarized ? "Yes" : "No"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function CohabitantsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <Empty>No cohabitants listed.</Empty>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Relationship</TableHead>
          <TableHead>Affidavit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id as string}>
            <TableCell className="font-medium">{r.name as string}</TableCell>
            <TableCell className="text-muted-foreground">{(r.relationship as string) ?? "—"}</TableCell>
            <TableCell>
              <StatusBadge status={(r.affidavit_status as string) ?? "not_started"} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TrainingTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <Empty>No training scheduled.</Empty>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Instructor</TableHead>
          <TableHead>Class date</TableHead>
          <TableHead>Range date</TableHead>
          <TableHead>Attended</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Passed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const inst = r.instructors as { name: string } | null
          return (
            <TableRow key={r.id as string}>
              <TableCell className="font-medium">{inst?.name ?? "—"}</TableCell>
              <TableCell>{formatDate(r.class_date as string)}</TableCell>
              <TableCell>{formatDate(r.range_date as string)}</TableCell>
              <TableCell>{r.attended ? "Yes" : "No"}</TableCell>
              <TableCell>{(r.test_score as number) ?? "—"}</TableCell>
              <TableCell>{r.passed == null ? "—" : r.passed ? "Yes" : "No"}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function PaymentsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <Empty>No payments recorded.</Empty>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Paid</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id as string}>
            <TableCell className="font-medium">{(r.description as string) ?? "—"}</TableCell>
            <TableCell className="capitalize text-muted-foreground">{r.type as string}</TableCell>
            <TableCell>{money(r.amount_cents as number)}</TableCell>
            <TableCell>
              <StatusBadge status={r.status as string} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {r.paid_at ? formatDate(r.paid_at as string) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}
