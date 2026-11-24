import { TrackView } from "@/components/analytics/track-view";
import { FilingQueueWorkspace } from "@/components/admin/filing-queue-workspace";
import { requireStaff } from "@/lib/auth";
import { buildQaQueue, sortQueue } from "@/lib/admin/queue";
import { createClient } from "@/lib/supabase/server";
import { resolveAdminBrandFilter } from "@/lib/admin/brand-filter";

export const metadata = { title: { absolute: "Filing queue · Staff" } };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId, profile } = await requireStaff();
  const params = await searchParams;
  const view = first(params.view) === "matrix" ? "matrix" : "desk";
  const showHidden = first(params.hidden) === "1";
  const brand = await resolveAdminBrandFilter(first(params.brand));
  const supabase = await createClient();

  // Load hidden rows once so the "Show" count follows the exact same Pipeline
  // classification. Nothing here mutates a case or changes gate enforcement.
  const allRows = await buildQaQueue(supabase, { showHidden: true, currentUserId: userId });
  const brandRows = allRows.filter((row) => brand === "all" || row.brand === brand);
  const hidden = {
    test: brandRows.filter((row) => row.isDemo).length,
    duplicate: brandRows.filter((row) => !row.isDemo && row.hiddenDuplicate).length,
  };
  const rows = sortQueue(
    showHidden ? brandRows : brandRows.filter((row) => !row.isDemo && !row.hiddenDuplicate),
  );

  return (
    <>
      <TrackView event="admin_queue_viewed" params={{ view }} />
      <FilingQueueWorkspace
        rows={rows}
        view={view}
        showHidden={showHidden}
        hidden={hidden}
        staffName={profile.full_name || "Staff member"}
        storageKey={`admin-filing-queue-help:${userId}`}
        brand={brand}
      />
    </>
  );
}
