function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#EAECF0] ${className}`} />
}

export default function PrivacyLoading() {
  return <div className="mx-auto max-w-[1480px] pb-12" aria-label="Loading privacy requests" aria-busy="true">
    <Skeleton className="h-10 w-40" />
    <Skeleton className="mt-3 h-4 w-[min(100%,620px)]" />
    <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]"><Skeleton className="h-[430px]" /><Skeleton className="hidden h-[560px] xl:block" /></div>
    <Skeleton className="mt-5 h-[320px]" />
  </div>
}
