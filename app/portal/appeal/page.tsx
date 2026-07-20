import Link from "next/link"
import { Download, Scale, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { AppealReferralButton } from "@/components/portal/appeal-referral"
import { formatDate, daysSince } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Appeal" }

const APPEAL_WINDOW_DAYS = 90

/**
 * V3-P3.3 — the appeal seam, stated honestly: only the applicant or a
 * NY-licensed attorney may submit an appeal; no new documents are considered.
 * We assemble the record and make the attorney hand-off.
 */
export default async function AppealPage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const supabase = await createClient()
  const { data: kase } = await supabase
    .from("cases")
    .select("status, stage, stage_entered_at")
    .eq("id", myCase.id)
    .single()

  const denied = kase?.status === "denied"
  if (!denied) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Appeals</h1>
        <p className="rounded-lg border bg-card p-6 text-sm text-text-mid">
          This page becomes active only if an application is denied. If that happens: there is a strict
          <b> 90-day window</b> to appeal, the appeal must be sworn and notarized, no new documents are
          considered, and — by NYPD rule — <b>only you or a New York–licensed attorney</b> may submit it.
          We can&apos;t file it for you, but we assemble your complete record and connect you with a
          partner attorney immediately.
        </p>
        <p className="text-xs text-text-low">
          You can download your complete file any time from your{" "}
          <Link href="/portal/forms" className="text-signal underline">
            documents
          </Link>
          .
        </p>
      </div>
    )
  }

  const deniedSince = daysSince(kase?.stage_entered_at ?? null) ?? 0
  const daysLeft = Math.max(0, APPEAL_WINDOW_DAYS - deniedSince)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your appeal window</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A denial is not the end — but the clock is strict and the rules are narrow.
        </p>
      </div>

      <Card className="brass-edge">
        <CardContent className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-warn" />
            {daysLeft > 0 ? (
              <>
                About <b>{daysLeft} days remain</b> in the 90-day appeal window
                {kase?.stage_entered_at && <> (denial recorded {formatDate(kase.stage_entered_at)})</>}.
              </>
            ) : (
              <>The standard 90-day window has likely passed — an attorney can advise on any remaining options.</>
            )}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-mid">
            <li>The appeal must be <b>sworn and notarized</b>.</li>
            <li><b>No new documents</b> are considered — the appeal argues the existing record.</li>
            <li>
              By NYPD rule, <b>only you or a New York–licensed attorney</b> may submit it. We cannot file it
              for you — and anyone who says otherwise is wrong.
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex h-full flex-col p-5">
            <Scale className="size-5 text-signal" />
            <h3 className="mt-2 text-sm font-semibold">Attorney hand-off</h3>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">
              We connect you with a NY-licensed firearms attorney and transfer your complete, organized
              record — the strongest starting position an appeal can have.
            </p>
            <div className="mt-3">
              <AppealReferralButton />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-full flex-col p-5">
            <Download className="size-5 text-signal" />
            <h3 className="mt-2 text-sm font-semibold">Export your file for an attorney</h3>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">
              One PDF with your complete record — every document you filed, merged in order with a
              cover sheet and index, plus the answers as they went in. Hand it to counsel on day one.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 w-fit">
              <a href="/portal/filing-pack" target="_blank" rel="noreferrer">
                <Download className="size-4" /> Export for my attorney
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
