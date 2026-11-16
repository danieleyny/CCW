import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { PageHeader } from "@/components/shared/page-header"
import { ProfileForms } from "@/components/portal/profile-form"
import { getMessages } from "@/lib/i18n"

export const metadata = { title: "Your profile" }

export default async function PortalProfilePage() {
  const [{ profile }, messages] = await Promise.all([requireRole(["client"]), getMessages()])
  const supabase = await createClient()
  const [{ data: auth }, myCase] = await Promise.all([supabase.auth.getUser(), getMyCase()])
  const client = myCase?.client

  return (
    <div>
      <PageHeader title={messages.ui.profileTitle} description={messages.ui.profileDescription} />
      <div className="mt-6">
        <ProfileForms
          fullName={client?.full_name ?? profile.full_name ?? ""}
          email={auth.user?.email ?? client?.email ?? ""}
          phone={client?.phone ?? ""}
        />
      </div>
    </div>
  )
}
