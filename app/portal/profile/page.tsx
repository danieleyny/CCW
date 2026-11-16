import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { ProfileForms } from "@/components/portal/profile-form"
import { getMessages } from "@/lib/i18n"

export async function generateMetadata() {
  const t = await getMessages()
  return { title: t.ui.profileTitle }
}

export default async function PortalProfilePage() {
  const [{ profile }, messages] = await Promise.all([requireRole(["client"]), getMessages()])
  const supabase = await createClient()
  const [{ data: auth }, myCase] = await Promise.all([supabase.auth.getUser(), getMyCase()])
  const client = myCase?.client

  return (
    <div className="profile-page-v2">
      <header className="profile-page-header">
        <p>{messages.ui.profileEyebrow}</p>
        <h1>{messages.ui.profileTitle}</h1>
        <span>{messages.ui.profileDescription}</span>
      </header>
      <ProfileForms
        fullName={client?.full_name ?? profile.full_name ?? ""}
        email={auth.user?.email ?? client?.email ?? ""}
        phone={client?.phone ?? ""}
        serviceMode={(myCase?.service_mode as "concierge" | "self_guided" | null) ?? null}
        memberSince={auth.user?.created_at ?? null}
      />
    </div>
  )
}
