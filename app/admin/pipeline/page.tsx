import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  loadPipeline,
  type PipelineAssignedFilter,
  type PipelineServiceFilter,
  type PipelineTrackFilter,
  type PipelineView,
} from "@/lib/admin/pipeline";
import { PipelineBoard } from "@/components/admin/pipeline-board";
import { TrackView } from "@/components/analytics/track-view";
import { resolveAdminBrandFilter } from "@/lib/admin/brand-filter";

export const metadata = { title: { absolute: "Pipeline · Staff" } };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await requireStaff();
  const sp = await searchParams;
  const view: PipelineView = first(sp.view) === "leads" ? "leads" : "active";
  const trackValue = first(sp.track);
  const serviceValue = first(sp.service);
  const assignedValue = first(sp.assigned);
  const filters = {
    brand: await resolveAdminBrandFilter(first(sp.brand)),
    track: (["premise", "concealed", "special"].includes(trackValue ?? "")
      ? trackValue
      : "all") as PipelineTrackFilter,
    service: (["concierge", "self_guided", "none"].includes(serviceValue ?? "")
      ? serviceValue
      : "all") as PipelineServiceFilter,
    assigned: (assignedValue || "all") as PipelineAssignedFilter,
    stalled: first(sp.stalled) === "1",
    currentUserId: userId,
  };
  const supabase = await createClient();
  const result = await loadPipeline(supabase, {
    view,
    showHidden: first(sp.hidden) === "1",
    filters,
  });
  const { allCards: _allCards, ...data } = result;
  void _allCards;
  return (
    <>
      <TrackView
        event="admin_pipeline_viewed"
        params={{
          view,
          track: filters.track,
          service: filters.service,
          assigned: filters.assigned,
          stalled: filters.stalled,
          showHidden: data.showHidden,
        }}
      />
      <PipelineBoard data={data} />
    </>
  );
}
