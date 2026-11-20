import { Skeleton } from "@/components/ui/skeleton"

export default function ConciergeLoading() {
  return (
    <div className="space-y-5" aria-label="Loading concierge workspace" aria-busy="true">
      <div className="space-y-2"><Skeleton className="h-9 w-44" /><Skeleton className="h-4 w-full max-w-2xl" /></div>
      <div className="flex gap-3"><Skeleton className="h-11 w-28" /><Skeleton className="h-11 w-40" /><Skeleton className="h-11 w-24" /></div>
      <div className="hidden grid-cols-6 gap-2.5 md:grid">
        {Array.from({ length: 6 }, (_, column) => <div key={column} className="space-y-3 rounded-xl bg-[#EDF0F4] p-3"><Skeleton className="h-6 w-28" /><Skeleton className="h-3 w-full" />{Array.from({ length: 3 }, (__, row) => <Skeleton key={row} className="h-36 w-full rounded-xl" />)}</div>)}
      </div>
      <div className="space-y-2 md:hidden">{Array.from({ length: 6 }, (_, row) => <Skeleton key={row} className="h-28 w-full rounded-xl" />)}</div>
    </div>
  )
}
