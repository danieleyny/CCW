import { requireStaff } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { VerifyLiveChecklist } from "@/components/admin/verify-live-checklist"

export const metadata = { title: "Verify-live checklist" }

export default async function VerifyLivePage() {
  await requireStaff()
  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify-live checklist"
        description="NYC is a discretionary, litigation-driven jurisdiction — reference counts, the social-media requirement, fees, and prohibited locations shift. Run this standing check against the live NYPD portal before assembling or filing any packet."
      />
      <VerifyLiveChecklist />
    </div>
  )
}
