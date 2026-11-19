function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[var(--surface-2)] ${className}`} />
}

export default function ReportsLoading() {
  return <div className="mx-auto max-w-[1520px] pb-16" aria-label="Loading reports" aria-busy="true">
    <Skeleton className="h-10 w-40" />
    <Skeleton className="mt-3 h-4 w-[min(100%,540px)]" />
    <Skeleton className="mt-6 h-12 w-full" />
    <Skeleton className="mt-5 h-20 w-full" />
    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-32" />)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2"><Skeleton className="h-[360px]" /><Skeleton className="h-[360px]" /></div>
    <Skeleton className="mt-5 h-[430px] w-full" />
  </div>
}
