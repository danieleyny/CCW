import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import {
  ReferenceCollector,
  CohabitantCollector,
  type ReferenceRow,
  type CohabitantRow,
} from "@/components/portal/collectors"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata = { title: "References & household" }

export default async function PeoplePage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const supabase = await createClient()
  const [refs, cohabs] = await Promise.all([
    supabase
      .from("character_references")
      .select("id, name, relationship, is_family, contact_email, notarized, received")
      .eq("case_id", myCase.id)
      .order("created_at"),
    supabase
      .from("cohabitants")
      .select("id, name, relationship, affidavit_status")
      .eq("case_id", myCase.id)
      .order("created_at"),
  ])

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">References &amp; household</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your character references and everyone 18+ living with you.
        </p>
      </div>

      <Tabs defaultValue="references">
        <TabsList>
          <TabsTrigger value="references">References ({refs.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="household">Household ({cohabs.data?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="references" className="mt-4">
          <ReferenceCollector caseId={myCase.id} references={(refs.data ?? []) as ReferenceRow[]} />
        </TabsContent>
        <TabsContent value="household" className="mt-4">
          <CohabitantCollector caseId={myCase.id} cohabitants={(cohabs.data ?? []) as CohabitantRow[]} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
