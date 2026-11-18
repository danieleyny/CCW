import { PageHeader } from "@/components/shared/page-header"
import { NewClientForm } from "@/components/admin/new-client-form"

export const metadata = { title: { absolute: "New client · Staff" } }

export default function NewClientPage() {
  return (
    <div>
      <PageHeader title="Add a client" description="Manually create a client and open their case." />
      <NewClientForm />
    </div>
  )
}
