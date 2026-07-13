import { cn } from "@/lib/utils"

/**
 * V4-B5 — the skeleton primitive, built on the `.shimmer` utility. Use inside a
 * `<Suspense fallback={…}>` around a slow server read, or while a client view
 * loads. (V3 removed route-level loading.tsx over a Next 16 streaming-reveal
 * defect; prefer in-component Suspense boundaries, which don't hit it.)
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} aria-hidden />
}

/** A few stacked lines — a generic "content loading" block. */
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  )
}

/** A card-shaped placeholder. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-hairline bg-card p-5", className)}>
      <Skeleton className="h-5 w-1/3" />
      <SkeletonLines className="mt-4" lines={3} />
    </div>
  )
}
