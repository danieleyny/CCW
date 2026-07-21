/**
 * "Your fees & how to pay them" — a one-page sheet to print and take to the
 * fingerprint appointment, where the fee is due in person and the phone in your
 * pocket is the worst place to be hunting for the details.
 *
 * ONE PAGE IS THE POINT: a second sheet is the sheet people leave at home, so
 * the type here is deliberately tighter than the rest of the document set.
 *
 * Every amount is passed in from computeFeeSummary, which reads the fee
 * schedule. Nothing in this file knows a dollar value of its own.
 */
import { buildPdf, type DrawOpts } from "@/lib/pdf/builder"
import { FINGERPRINT_SCHEDULING, type FeeSummary } from "@/lib/fees"
import { brand } from "@/config/brand"

/** Compact body style — this sheet trades a little air for fitting on one page. */
const LINE: DrawOpts = { size: 9.5, lead: 13, gap: 1 }
const MUTED: DrawOpts = { ...LINE, color: "muted" }

export async function renderFeeSheet(args: {
  applicantName: string
  caseRef?: string
  summary: FeeSummary
}): Promise<Uint8Array> {
  const { applicantName, caseRef, summary } = args

  return buildPdf(
    (c) => {
      c.heading("Your fees & how to pay them", "NYC concealed-carry license application")
      c.rule()

      c.para(
        `These fees are paid by you, directly to the agencies below. ${brand.name} never collects, holds, or forwards them — our service fee is separate and is not on this sheet.`,
        MUTED
      )
      c.spacer(4)

      for (const item of summary.items) {
        c.keepTogether(80)
        c.h2(`${item.label} — ${item.waived ? "$0" : item.amount}`)
        if (item.waived && item.waivedReason) {
          c.para(item.waivedReason, { ...LINE, color: "brass" })
        }
        c.para(`Pay to: ${item.payTo}`, LINE)
        c.para(`When: ${item.when}`, LINE)
        for (const how of item.how) c.bullet(how)
        if (item.caveat) c.para(item.caveat, MUTED)
        c.spacer(4)
      }

      c.rule()
      c.para(`Total you will pay directly: ${summary.total}`, { bold: true, size: 11.5, gap: 2 })
      c.para(summary.nonRefundable, MUTED)
      c.spacer(6)

      c.keepTogether(120)
      c.h2("Your fingerprinting appointment")
      c.para(FINGERPRINT_SCHEDULING.process, LINE)
      c.para(`Done in person at ${FINGERPRINT_SCHEDULING.location}.`, LINE)
      c.para(`NYPD application instructions: ${FINGERPRINT_SCHEDULING.instructionsUrl}`, LINE)
      c.spacer(2)
      c.para("Bring with you:", LINE)
      for (const b of FINGERPRINT_SCHEDULING.bring) c.bullet(b)

      c.spacer(4)
      c.para(
        "You submit and pay for your own application at licensing.nypdonline.org. We prepare and organize; we do not file on your behalf.",
        MUTED
      )
    },
    {
      docTitle: "Your fees & how to pay them",
      applicantName,
      caseRef,
    }
  )
}
