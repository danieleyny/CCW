import { requireRole } from "@/lib/auth"
import { getMessages } from "@/lib/i18n"
import { getMyCase } from "@/lib/portal"
import { stageIndex, type CaseStageKey } from "@/config/stages"
import { InterviewBriefing } from "@/components/portal/interview-briefing"
import {
  INTERVIEW_OVERVIEW,
  INTERVIEW_SECTIONS,
  PRACTICE_QUESTIONS,
  INTERVIEW_DISCLAIMER,
} from "@/content/interview"

export const metadata = { title: "Interview prep" }

/** Owner switch for the optional summary in the hero. */
const SHOW_INTERVIEW_RULE_CARD = true

/**
 * PART C / Phase 9 — the applicant's interview-prep module. Content-driven,
 * reassuring, candor-first. Prep, never coaching to mislead.
 */
export default async function InterviewPrepPage() {
  await requireRole(["client"])
  const [myCase, messages] = await Promise.all([getMyCase(), getMessages()])
  const earlyStage = myCase
    ? stageIndex(myCase.stage as CaseStageKey) < stageIndex("filed")
    : false

  return (
    <InterviewBriefing
      overview={INTERVIEW_OVERVIEW}
      sections={INTERVIEW_SECTIONS}
      questions={PRACTICE_QUESTIONS}
      disclaimer={INTERVIEW_DISCLAIMER}
      copy={messages.interview}
      earlyStage={earlyStage}
      showRuleCard={SHOW_INTERVIEW_RULE_CARD}
    />
  )
}
